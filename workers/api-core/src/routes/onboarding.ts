import { z } from 'zod'
import { neon } from '@neondatabase/serverless'
import type { Env } from '../index'
import type { AuthContext } from '../middleware/auth'
import { json, AppError } from '../utils/errors'
import { validateBody } from '../utils/validation'

// ===========================================
// Schemas
// ===========================================

const detailsSchema = z.object({
  first_name: z.string().min(2).max(50),
  business_name: z.string().max(100).nullable(),
  postcode: z.string().min(5).max(10),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  service_radius_miles: z.number().min(5).max(50),
  phone: z.string().min(10).max(15),
})

const servicesSchema = z.object({
  categories: z.array(z.string().min(1).max(200)).min(1).max(20),
})

const pricingSchema = z.object({
  pricing: z.array(
    z.object({
      category: z.string().min(1),
      price_from: z.number().min(0).max(999999).nullable(),
      price_to: z.number().min(0).max(999999).nullable(),
      day_rate: z.number().min(0).max(999999).nullable(),
      pricing_note: z.string().max(200).nullable(),
    })
  ),
})

const voiceConfirmSchema = z.object({
  r2_key: z.string().min(1),
  duration_seconds: z.number().min(20).max(180),
})

const verificationSchema = z.object({
  type: z.enum(['registration', 'insurance']),
  scheme: z.string().max(50).optional(),
  reference_number: z.string().max(50).optional(),
  document_r2_key: z.string().optional(),
})

// ===========================================
// Helpers
// ===========================================

async function getElectricianId(sql: ReturnType<typeof neon>, clerkId: string): Promise<string> {
  const rows = await sql('SELECT id FROM electricians WHERE clerk_id = $1', [clerkId])
  if (rows.length === 0) throw new AppError('Complete step 2 first', 400, 'STEP_ORDER')
  return rows[0].id as string
}

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')
    .replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 60) || 'electrician'
}

/**
 * Fire-and-forget trigger to the verification worker.
 * Non-blocking — if the worker is down, verification stays as 'pending'.
 */
async function triggerVerificationWorker(
  env: Env,
  verificationId: string,
  electricianId: string,
  type: string,
  scheme?: string,
  referenceNumber?: string,
  documentR2Key?: string
): Promise<void> {
  const workerUrl = env.VERIFICATION_WORKER_URL
  const secret = env.INTERNAL_SECRET

  if (!workerUrl || !secret) {
    console.warn('Verification worker URL or secret not configured — skipping trigger')
    return
  }

  try {
    // Fire and forget — don't await the full processing
    await fetch(`${workerUrl}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secret}`,
      },
      body: JSON.stringify({
        verification_id: verificationId,
        electrician_id: electricianId,
        type,
        scheme,
        reference_number: referenceNumber,
        document_r2_key: documentR2Key,
      }),
    })
  } catch (err) {
    // Non-blocking — log but don't fail the request
    console.error('Failed to trigger verification worker:', err)
  }
}

// ===========================================
// Handlers
// ===========================================

export async function handleOnboardingDetails(
  request: Request, env: Env, auth: AuthContext
): Promise<Response> {
  const data = await validateBody(request, detailsSchema)
  const sql = neon(env.NEON_DATABASE_URL)

  const existing = await sql('SELECT id FROM electricians WHERE clerk_id = $1', [auth.userId])

  if (existing.length > 0) {
    await sql(
      `UPDATE electricians SET
        first_name = $1, business_name = $2, postcode = $3, lat = $4, lng = $5,
        service_radius_miles = $6, phone = $7, onboarding_step = GREATEST(onboarding_step, 3)
      WHERE clerk_id = $8`,
      [data.first_name, data.business_name, data.postcode, data.lat, data.lng,
       data.service_radius_miles, data.phone, auth.userId]
    )
    return json({ success: true, id: existing[0].id }, 200, request)
  }

  const rows = await sql(
    `INSERT INTO electricians (
      clerk_id, first_name, business_name, email, phone,
      postcode, lat, lng, service_radius_miles, agent_status, onboarding_step
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'onboarding', 3)
    RETURNING id`,
    [auth.userId, data.first_name, data.business_name,
     `${auth.userId}@placeholder.tradgo.co.uk`, data.phone,
     data.postcode, data.lat, data.lng, data.service_radius_miles]
  )

  return json({ success: true, id: rows[0].id }, 201, request)
}

export async function handleOnboardingServices(
  request: Request, env: Env, auth: AuthContext
): Promise<Response> {
  const data = await validateBody(request, servicesSchema)
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  await sql('DELETE FROM services WHERE electrician_id = $1', [electricianId])
  for (const category of data.categories) {
    await sql('INSERT INTO services (electrician_id, category) VALUES ($1, $2)', [electricianId, category])
  }
  await sql('UPDATE electricians SET onboarding_step = GREATEST(onboarding_step, 4) WHERE id = $1', [electricianId])

  return json({ success: true, count: data.categories.length }, 200, request)
}

export async function handleGetServices(
  request: Request, env: Env, auth: AuthContext
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)
  const rows = await sql(
    'SELECT category, price_from, price_to, day_rate, pricing_note FROM services WHERE electrician_id = $1 ORDER BY created_at',
    [electricianId]
  )
  return json({ services: rows }, 200, request)
}

export async function handleOnboardingPricing(
  request: Request, env: Env, auth: AuthContext
): Promise<Response> {
  const data = await validateBody(request, pricingSchema)
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  for (const p of data.pricing) {
    await sql(
      `UPDATE services SET price_from = $1, price_to = $2, day_rate = $3, pricing_note = $4
       WHERE electrician_id = $5 AND category = $6`,
      [p.price_from, p.price_to, p.day_rate, p.pricing_note, electricianId, p.category]
    )
  }
  await sql('UPDATE electricians SET onboarding_step = GREATEST(onboarding_step, 5) WHERE id = $1', [electricianId])

  return json({ success: true }, 200, request)
}

export async function handleVoiceBlobUpload(
  request: Request, env: Env, auth: AuthContext
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  const contentType = request.headers.get('Content-Type') || 'audio/webm'
  const key = `voice/${electricianId}/${Date.now()}.webm`

  const body = await request.arrayBuffer()
  if (body.byteLength === 0) throw new AppError('Empty audio file', 400)
  if (body.byteLength > 10 * 1024 * 1024) throw new AppError('File too large (max 10MB)', 400)

  await env.BUCKET.put(key, body, { httpMetadata: { contentType } })

  return json({ key }, 200, request)
}

export async function handleVoiceConfirm(
  request: Request, env: Env, auth: AuthContext
): Promise<Response> {
  const data = await validateBody(request, voiceConfirmSchema)
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  await sql('DELETE FROM voice_recordings WHERE electrician_id = $1', [electricianId])
  await sql(
    'INSERT INTO voice_recordings (electrician_id, r2_key, duration_seconds, processed) VALUES ($1, $2, $3, false)',
    [electricianId, data.r2_key, data.duration_seconds]
  )
  await sql('UPDATE electricians SET onboarding_step = GREATEST(onboarding_step, 6) WHERE id = $1', [electricianId])

  return json({ success: true }, 200, request)
}

export async function handleVerification(
  request: Request, env: Env, auth: AuthContext
): Promise<Response> {
  const data = await validateBody(request, verificationSchema)
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  // Delete existing verification of same type
  await sql('DELETE FROM verifications WHERE electrician_id = $1 AND type = $2', [electricianId, data.type])

  let verificationId: string

  if (data.type === 'registration') {
    const rows = await sql(
      `INSERT INTO verifications (electrician_id, type, scheme, reference_number, status)
       VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
      [electricianId, data.type, data.scheme || null, data.reference_number || null]
    )
    verificationId = rows[0].id as string

    // Trigger background verification
    await triggerVerificationWorker(
      env, verificationId, electricianId, data.type,
      data.scheme, data.reference_number
    )
  } else {
    const rows = await sql(
      `INSERT INTO verifications (electrician_id, type, document_r2_key, status)
       VALUES ($1, $2, $3, 'pending') RETURNING id`,
      [electricianId, data.type, data.document_r2_key || null]
    )
    verificationId = rows[0].id as string

    // Trigger background verification
    await triggerVerificationWorker(
      env, verificationId, electricianId, data.type,
      undefined, undefined, data.document_r2_key
    )
  }

  return json({ success: true, verification_id: verificationId }, 200, request)
}

export async function handleInsuranceUpload(
  request: Request, env: Env, auth: AuthContext
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  const contentType = request.headers.get('Content-Type') || 'application/pdf'
  const key = `insurance/${electricianId}/${Date.now()}`

  const body = await request.arrayBuffer()
  if (body.byteLength === 0) throw new AppError('Empty file', 400)
  if (body.byteLength > 5 * 1024 * 1024) throw new AppError('File too large (max 5MB)', 400)

  await env.BUCKET.put(key, body, { httpMetadata: { contentType } })

  return json({ key }, 200, request)
}

export async function handleVerifyComplete(
  request: Request, env: Env, auth: AuthContext
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)
  await sql('UPDATE electricians SET onboarding_step = GREATEST(onboarding_step, 7) WHERE id = $1', [electricianId])
  return json({ success: true }, 200, request)
}

export async function handleGoLiveData(
  request: Request, env: Env, auth: AuthContext
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const rows = await sql('SELECT id, first_name, business_name FROM electricians WHERE clerk_id = $1', [auth.userId])
  if (rows.length === 0) throw new AppError('Not found', 404)

  const elec = rows[0]
  const displayName = (elec.business_name as string) || (elec.first_name as string)
  const slug = generateSlug(displayName)

  const existing = await sql('SELECT slug FROM agent_pages WHERE electrician_id = $1', [elec.id])

  let finalSlug: string
  if (existing.length > 0) {
    finalSlug = existing[0].slug as string
  } else {
    let candidate = slug
    let counter = 1
    while (true) {
      const check = await sql('SELECT id FROM agent_pages WHERE slug = $1', [candidate])
      if (check.length === 0) break
      candidate = `${slug}-${counter}`
      counter++
    }
    finalSlug = candidate
    await sql('INSERT INTO agent_pages (electrician_id, slug, is_active) VALUES ($1, $2, true)', [elec.id, finalSlug])
  }

  return json({
    first_name: elec.first_name,
    business_name: elec.business_name,
    slug: finalSlug,
    agent_page_url: `https://tradgo.co.uk/agent/${finalSlug}`,
  }, 200, request)
}

export async function handleActivate(
  request: Request, env: Env, auth: AuthContext
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  await sql(
    `UPDATE electricians SET agent_status = 'live', onboarding_completed_at = now() WHERE id = $1`,
    [electricianId]
  )

  const existingPrefs = await sql('SELECT id FROM notification_preferences WHERE electrician_id = $1', [electricianId])
  if (existingPrefs.length === 0) {
    await sql('INSERT INTO notification_preferences (electrician_id) VALUES ($1)', [electricianId])
  }

  return json({ success: true, status: 'live' }, 200, request)
}
