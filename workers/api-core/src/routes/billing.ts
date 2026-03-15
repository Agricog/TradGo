import { neon } from '@neondatabase/serverless'
import type { Env } from '../index'
import type { AuthContext } from '../middleware/auth'
import { json, AppError } from '../utils/errors'

// ===========================================
// Helpers
// ===========================================

async function getElectrician(sql: ReturnType<typeof neon>, clerkId: string) {
  const rows = await sql(
    'SELECT id, email, first_name, stripe_customer_id, subscription_status, trial_ends_at FROM electricians WHERE clerk_id = $1',
    [clerkId]
  )
  if (rows.length === 0) throw new AppError('Electrician not found', 404)
  return rows[0] as Record<string, unknown>
}

async function stripeRequest(
  path: string,
  method: string,
  secretKey: string,
  body?: Record<string, string>
): Promise<Record<string, unknown>> {
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${secretKey}`,
  }

  let fetchBody: string | undefined
  if (body) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
    fetchBody = new URLSearchParams(body).toString()
  }

  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers,
    body: fetchBody,
  })

  const data = await res.json() as Record<string, unknown>
  if (!res.ok) {
    console.error('Stripe API error:', JSON.stringify(data))
    throw new AppError('Billing service error', 502)
  }

  return data
}

// ===========================================
// Handlers
// ===========================================

/**
 * POST /api/billing/create-checkout
 * Creates a Stripe Checkout session for a new subscription.
 */
export async function handleCreateCheckout(
  request: Request,
  env: Env,
  auth: AuthContext,
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const elec = await getElectrician(sql, auth.userId)

  const reqBody = await request.json() as { plan: string }
  const plan = reqBody.plan || 'solo'

  const priceId = plan === 'growth'
    ? (env as Record<string, string>).STRIPE_PRICE_GROWTH
    : (env as Record<string, string>).STRIPE_PRICE_SOLO

  if (!priceId) throw new AppError('Price not configured', 500)

  // Create or reuse Stripe customer
  let customerId = elec.stripe_customer_id as string | null

  if (!customerId) {
    const customer = await stripeRequest('/customers', 'POST', (env as Record<string, string>).STRIPE_SECRET_KEY, {
      email: elec.email as string,
      name: elec.first_name as string,
      'metadata[electrician_id]': elec.id as string,
    })
    customerId = customer.id as string

    await sql('UPDATE electricians SET stripe_customer_id = $1 WHERE id = $2', [customerId, elec.id])
  }

  const frontendUrl = (env as Record<string, string>).FRONTEND_URL || 'https://tradgo-production.up.railway.app'

  // Create checkout session with 14-day trial
  const session = await stripeRequest('/checkout/sessions', 'POST', (env as Record<string, string>).STRIPE_SECRET_KEY, {
    'customer': customerId,
    'mode': 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'subscription_data[trial_period_days]': '14',
    'success_url': `${frontendUrl}/dashboard/settings?billing=success`,
    'cancel_url': `${frontendUrl}/dashboard/settings?billing=cancelled`,
    'allow_promotion_codes': 'true',
  })

  return json({ url: session.url }, 200, request)
}

/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session for managing subscription.
 */
export async function handleBillingPortal(
  request: Request,
  env: Env,
  auth: AuthContext,
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const elec = await getElectrician(sql, auth.userId)

  if (!elec.stripe_customer_id) {
    throw new AppError('No billing account found. Subscribe first.', 400)
  }

  const frontendUrl = (env as Record<string, string>).FRONTEND_URL || 'https://tradgo-production.up.railway.app'

  const session = await stripeRequest('/billing_portal/sessions', 'POST', (env as Record<string, string>).STRIPE_SECRET_KEY, {
    'customer': elec.stripe_customer_id as string,
    'return_url': `${frontendUrl}/dashboard/settings`,
  })

  return json({ url: session.url }, 200, request)
}

/**
 * GET /api/billing/status
 * Returns current billing status for the dashboard.
 */
export async function handleBillingStatus(
  request: Request,
  env: Env,
  auth: AuthContext,
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const elec = await getElectrician(sql, auth.userId)

  const status = elec.subscription_status as string || 'trialing'
  const trialEnds = elec.trial_ends_at as string | null

  let plan = 'Free trial'
  if (status === 'active') plan = 'Solo — £149/month' // Can be refined to check actual Stripe subscription

  return json({
    plan,
    status,
    trial_ends_at: trialEnds,
    has_billing_account: !!elec.stripe_customer_id,
  }, 200, request)
}

/**
 * POST /api/billing/webhook
 * Handles Stripe webhook events. No auth — verified by signature.
 */
export async function handleStripeWebhook(
  request: Request,
  env: Env,
): Promise<Response> {
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing signature', { status: 400 })
  }

  const body = await request.text()
  const webhookSecret = (env as Record<string, string>).STRIPE_WEBHOOK_SECRET

  // Verify webhook signature
  const verified = await verifyStripeSignature(body, signature, webhookSecret)
  if (!verified) {
    return new Response('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } }
  const sql = neon(env.NEON_DATABASE_URL)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        // Get subscription details to find trial end
        const sub = await stripeRequest(`/subscriptions/${subscriptionId}`, 'GET', (env as Record<string, string>).STRIPE_SECRET_KEY)

        const trialEnd = sub.trial_end ? new Date((sub.trial_end as number) * 1000).toISOString() : null

        await sql(
          `UPDATE electricians SET subscription_status = 'active', trial_ends_at = $1
           WHERE stripe_customer_id = $2`,
          [trialEnd, customerId]
        )
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const customerId = sub.customer as string
        const status = sub.status as string

        let dbStatus = 'active'
        if (status === 'past_due') dbStatus = 'past_due'
        if (status === 'canceled' || status === 'unpaid') dbStatus = 'expired'
        if (status === 'trialing') dbStatus = 'trialing'

        await sql(
          `UPDATE electricians SET subscription_status = $1 WHERE stripe_customer_id = $2`,
          [dbStatus, customerId]
        )

        // Pause agent if subscription expired
        if (dbStatus === 'expired') {
          await sql(
            `UPDATE electricians SET agent_status = 'paused' WHERE stripe_customer_id = $1`,
            [customerId]
          )
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const customerId = sub.customer as string

        await sql(
          `UPDATE electricians SET subscription_status = 'expired', agent_status = 'paused'
           WHERE stripe_customer_id = $1`,
          [customerId]
        )
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customerId = invoice.customer as string

        await sql(
          `UPDATE electricians SET subscription_status = 'past_due' WHERE stripe_customer_id = $1`,
          [customerId]
        )
        break
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
    // Return 200 anyway to prevent Stripe retries for processing errors
  }

  return new Response('OK', { status: 200 })
}

// ===========================================
// Signature verification
// ===========================================

async function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const pairs = signature.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=')
      if (key && value) acc[key.trim()] = value.trim()
      return acc
    }, {} as Record<string, string>)

    const timestamp = pairs['t']
    const sig = pairs['v1']
    if (!timestamp || !sig) return false

    // Check timestamp is within 5 minutes
    const now = Math.floor(Date.now() / 1000)
    if (Math.abs(now - parseInt(timestamp)) > 300) return false

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload))
    const expectedSig = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')

    return expectedSig === sig
  } catch {
    return false
  }
}
