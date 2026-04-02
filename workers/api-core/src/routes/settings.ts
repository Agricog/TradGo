import { z } from 'zod'
import { neon } from '@neondatabase/serverless'
import type { Env } from '../index'
import type { AuthContext } from '../middleware/auth'
import { json, AppError } from '../utils/errors'
import { validateBody } from '../utils/validation'

// ===========================================
// Schemas
// ===========================================

const reviewUrlSchema = z.object({
  google_review_url: z.string().url().max(500).nullable(),
})

// ===========================================
// Helpers
// ===========================================

async function getElectricianId(sql: ReturnType<typeof neon>, clerkId: string): Promise<string> {
  const rows = await sql('SELECT id FROM electricians WHERE clerk_id = $1', [clerkId])
  if (rows.length === 0) throw new AppError('Electrician not found', 404)
  return rows[0].id as string
}

// ===========================================
// Handlers
// ===========================================

/**
 * GET /api/settings/channels
 * Returns the status of each communication channel.
 */
export async function handleGetChannels(
  request: Request,
  env: Env,
  auth: AuthContext,
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  const rows = await sql(
    'SELECT twilio_number FROM electricians WHERE id = $1',
    [electricianId]
  )

  const elec = rows[0] || {}

  return json({
    sms: {
      active: !!elec.twilio_number,
      number: elec.twilio_number || null,
    },
    whatsapp: {
      active: false,
      status: 'Pending Meta approval',
    },
    web: {
      active: true,
    },
  }, 200, request)
}

/**
 * GET /api/settings/billing
 * Returns billing info. Stripe integration is Batch 19 — returns trial info for now.
 */
export async function handleGetBilling(
  request: Request,
  env: Env,
  auth: AuthContext,
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  const rows = await sql(
    'SELECT subscription_status, trial_ends_at, stripe_customer_id FROM electricians WHERE id = $1',
    [electricianId]
  )

  const elec = rows[0] || {}

  return json({
    plan: elec.subscription_status === 'active' ? 'Solo — £149/month' : 'Free trial',
    status: elec.subscription_status || 'trialing',
    trial_ends_at: elec.trial_ends_at || null,
    next_bill_date: null,
    portal_url: null, // Stripe portal URL added in Batch 19
  }, 200, request)
}

/**
 * GET /api/agent/profile
 * Returns agent profile data for the dashboard Agent tab.
 */
export async function handleGetAgentProfile(
  request: Request,
  env: Env,
  auth: AuthContext,
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  const [elecRows, serviceRows, verificationRows, voiceRows, pageRows] = await Promise.all([
    sql('SELECT first_name, business_name, postcode FROM electricians WHERE id = $1', [electricianId]),
    sql('SELECT category, price_from FROM services WHERE electrician_id = $1', [electricianId]),
    sql("SELECT type, scheme, status FROM verifications WHERE electrician_id = $1 AND status IN ('verified', 'pending')", [electricianId]),
    sql('SELECT duration_seconds FROM voice_recordings WHERE electrician_id = $1 ORDER BY created_at DESC LIMIT 1', [electricianId]),
    sql('SELECT slug FROM agent_pages WHERE electrician_id = $1', [electricianId]),
  ])

  const elec = elecRows[0]
  if (!elec) throw new AppError('Electrician not found', 404)

  const serviceCount = serviceRows.length
  const pricedCount = serviceRows.filter((s: Record<string, unknown>) => s.price_from !== null).length

  return json({
    first_name: elec.first_name,
    business_name: elec.business_name,
    area: elec.postcode,
    slug: pageRows[0]?.slug || null,
    service_count: serviceCount,
    priced_count: pricedCount,
    verification_badges: verificationRows.map((v: Record<string, unknown>) => ({
      type: v.type,
      scheme: v.scheme,
      status: v.status,
    })),
    voice_duration: voiceRows[0]?.duration_seconds || null,
  }, 200, request)
}

/**
 * GET /api/settings/review
 * Returns the electrician's Google review URL.
 */
export async function handleGetReviewUrl(
  request: Request,
  env: Env,
  auth: AuthContext,
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  const rows = await sql(
    'SELECT google_review_url FROM electricians WHERE id = $1',
    [electricianId]
  )

  return json({
    google_review_url: rows[0]?.google_review_url || null,
  }, 200, request)
}

/**
 * PUT /api/settings/review
 * Updates the electrician's Google review URL.
 */
export async function handleUpdateReviewUrl(
  request: Request,
  env: Env,
  auth: AuthContext,
): Promise<Response> {
  const data = await validateBody(request, reviewUrlSchema)
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  await sql(
    'UPDATE electricians SET google_review_url = $1, updated_at = now() WHERE id = $2',
    [data.google_review_url, electricianId]
  )

  return json({ success: true, google_review_url: data.google_review_url }, 200, request)
}

/**
 * POST /api/settings/export
 * Triggers a data export. For v1, returns a confirmation — actual export built later.
 */
export async function handleDataExport(
  request: Request,
  env: Env,
  auth: AuthContext,
): Promise<Response> {
  // Placeholder — actual export implementation in a later batch
  return json({ success: true, message: 'Data export requested. You will receive an email when ready.' }, 200, request)
}
