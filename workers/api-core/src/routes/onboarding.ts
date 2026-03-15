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

// ===========================================
// Handlers
// ===========================================

/**
 * POST /api/onboarding/details
 * Save step 2: basic electrician details.
 * Creates or updates the electrician record.
 */
export async function handleOnboardingDetails(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  const data = await validateBody(request, detailsSchema)
  const sql = neon(env.NEON_DATABASE_URL)

  // Check if electrician record already exists
  const existing = await sql(
    'SELECT id FROM electricians WHERE clerk_id = $1',
    [auth.userId]
  )

  if (existing.length > 0) {
    // Update existing record
    await sql(
      `UPDATE electricians SET
        first_name = $1,
        business_name = $2,
        postcode = $3,
        lat = $4,
        lng = $5,
        service_radius_miles = $6,
        phone = $7,
        onboarding_step = GREATEST(onboarding_step, 3)
      WHERE clerk_id = $8`,
      [
        data.first_name,
        data.business_name,
        data.postcode,
        data.lat,
        data.lng,
        data.service_radius_miles,
        data.phone,
        auth.userId,
      ]
    )

    return json({ success: true, id: existing[0].id }, 200, request)
  }

  // Get email from Clerk user ID — we need to look it up
  // For now, use a placeholder; the Clerk webhook will sync this
  const rows = await sql(
    `INSERT INTO electricians (
      clerk_id, first_name, business_name, email, phone,
      postcode, lat, lng, service_radius_miles,
      agent_status, onboarding_step
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'onboarding', 3)
    RETURNING id`,
    [
      auth.userId,
      data.first_name,
      data.business_name,
      `${auth.userId}@placeholder.tradgo.co.uk`,
      data.phone,
      data.postcode,
      data.lat,
      data.lng,
      data.service_radius_miles,
    ]
  )

  return json({ success: true, id: rows[0].id }, 201, request)
}

/**
 * POST /api/onboarding/services
 * Save step 3: selected service categories.
 * Replaces any existing services for the electrician.
 */
export async function handleOnboardingServices(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  const data = await validateBody(request, servicesSchema)
  const sql = neon(env.NEON_DATABASE_URL)

  // Get electrician ID
  const elec = await sql(
    'SELECT id FROM electricians WHERE clerk_id = $1',
    [auth.userId]
  )

  if (elec.length === 0) {
    throw new AppError('Complete step 2 first', 400, 'STEP_ORDER')
  }

  const electricianId = elec[0].id

  // Delete existing services (replace on re-submission)
  await sql('DELETE FROM services WHERE electrician_id = $1', [electricianId])

  // Insert new services
  for (const category of data.categories) {
    await sql(
      'INSERT INTO services (electrician_id, category) VALUES ($1, $2)',
      [electricianId, category]
    )
  }

  // Update onboarding step
  await sql(
    'UPDATE electricians SET onboarding_step = GREATEST(onboarding_step, 4) WHERE id = $1',
    [electricianId]
  )

  return json({ success: true, count: data.categories.length }, 200, request)
}
