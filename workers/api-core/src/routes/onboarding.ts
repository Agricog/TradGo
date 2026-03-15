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

const voiceUploadSchema = z.object({
  duration_seconds: z.number().min(20).max(180),
  content_type: z.string().min(1),
})

const voiceConfirmSchema = z.object({
  r2_key: z.string().min(1),
  duration_seconds: z.number().min(20).max(180),
})

// ===========================================
// Helpers
// ===========================================

async function getElectricianId(sql: ReturnType<typeof neon>, clerkId: string): Promise<string> {
  const rows = await sql('SELECT id FROM electricians WHERE clerk_id = $1', [clerkId])
  if (rows.length === 0) {
    throw new AppError('Complete step 2 first', 400, 'STEP_ORDER')
  }
  return rows[0].id as string
}

// ===========================================
// Handlers
// ===========================================

/**
 * POST /api/onboarding/details — Save step 2
 */
export async function handleOnboardingDetails(
  request: Request,
  env: Env,
  auth: AuthContext
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

/**
 * POST /api/onboarding/services — Save step 3
 */
export async function handleOnboardingServices(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  const data = await validateBody(request, servicesSchema)
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  await sql('DELETE FROM services WHERE electrician_id = $1', [electricianId])

  for (const category of data.categories) {
    await sql(
      'INSERT INTO services (electrician_id, category) VALUES ($1, $2)',
      [electricianId, category]
    )
  }

  await sql(
    'UPDATE electricians SET onboarding_step = GREATEST(onboarding_step, 4) WHERE id = $1',
    [electricianId]
  )

  return json({ success: true, count: data.categories.length }, 200, request)
}

/**
 * GET /api/onboarding/services — Load selected services for pricing step
 */
export async function handleGetServices(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  const rows = await sql(
    'SELECT category, price_from, price_to, day_rate, pricing_note FROM services WHERE electrician_id = $1 ORDER BY created_at',
    [electricianId]
  )

  return json({ services: rows }, 200, request)
}

/**
 * POST /api/onboarding/pricing — Save step 4
 */
export async function handleOnboardingPricing(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  const data = await validateBody(request, pricingSchema)
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  // Update pricing on existing service records
  for (const p of data.pricing) {
    await sql(
      `UPDATE services SET price_from = $1, price_to = $2, day_rate = $3, pricing_note = $4
       WHERE electrician_id = $5 AND category = $6`,
      [p.price_from, p.price_to, p.day_rate, p.pricing_note, electricianId, p.category]
    )
  }

  await sql(
    'UPDATE electricians SET onboarding_step = GREATEST(onboarding_step, 5) WHERE id = $1',
    [electricianId]
  )

  return json({ success: true }, 200, request)
}

/**
 * POST /api/onboarding/voice-upload — Generate R2 upload URL for voice recording
 */
export async function handleVoiceUpload(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  const data = await validateBody(request, voiceUploadSchema)
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  const key = `voice/${electricianId}/${Date.now()}.webm`

  // Store directly via R2 binding — we'll return a worker URL for upload
  // The frontend will POST the blob to our confirm endpoint instead
  return json({ uploadUrl: 'direct', key }, 200, request)
}

/**
 * POST /api/onboarding/voice-confirm — Save voice recording metadata after upload
 */
export async function handleVoiceConfirm(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  const data = await validateBody(request, voiceConfirmSchema)
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  // Delete any previous voice recording for this electrician
  await sql('DELETE FROM voice_recordings WHERE electrician_id = $1', [electricianId])

  await sql(
    `INSERT INTO voice_recordings (electrician_id, r2_key, duration_seconds, processed)
     VALUES ($1, $2, $3, false)`,
    [electricianId, data.r2_key, data.duration_seconds]
  )

  await sql(
    'UPDATE electricians SET onboarding_step = GREATEST(onboarding_step, 6) WHERE id = $1',
    [electricianId]
  )

  return json({ success: true }, 200, request)
}

/**
 * PUT /api/onboarding/voice-blob — Receive voice blob directly and store in R2
 */
export async function handleVoiceBlobUpload(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  const contentType = request.headers.get('Content-Type') || 'audio/webm'
  const key = `voice/${electricianId}/${Date.now()}.webm`

  // Store blob directly in R2
  const body = await request.arrayBuffer()
  if (body.byteLength === 0) {
    throw new AppError('Empty audio file', 400)
  }
  if (body.byteLength > 10 * 1024 * 1024) {
    throw new AppError('File too large (max 10MB)', 400)
  }

  await env.BUCKET.put(key, body, {
    httpMetadata: { contentType },
  })

  return json({ key }, 200, request)
}
