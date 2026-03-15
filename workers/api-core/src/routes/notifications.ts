import { neon } from '@neondatabase/serverless'
import { z } from 'zod'
import type { Env } from '../index'
import type { AuthContext } from '../middleware/auth'
import { json, AppError } from '../utils/errors'
import { validateBody } from '../utils/validation'

// ===========================================
// Schemas
// ===========================================

const pushSubscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
    expirationTime: z.number().nullable().optional(),
  }),
})

const preferencesSchema = z.object({
  push_enabled: z.boolean().optional(),
  digest_email_enabled: z.boolean().optional(),
  notification_sound: z.boolean().optional(),
  digest_email_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
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
 * GET /api/notifications/vapid-key
 */
export async function handleGetVapidKey(
  request: Request,
  env: Env,
): Promise<Response> {
  const publicKey = (env as Record<string, string>).VAPID_PUBLIC_KEY || ''
  return json({ publicKey }, 200, request)
}

/**
 * POST /api/notifications/push-subscribe
 */
export async function handlePushSubscribe(
  request: Request,
  env: Env,
  auth: AuthContext,
): Promise<Response> {
  const body = await validateBody(request, pushSubscribeSchema)
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  await sql(
    `UPDATE notification_preferences
     SET push_subscription = $2, push_enabled = true, updated_at = NOW()
     WHERE electrician_id = $1`,
    [electricianId, JSON.stringify(body.subscription)]
  )

  return json({ success: true }, 200, request)
}

/**
 * GET /api/settings/notifications
 */
export async function handleGetNotificationPreferences(
  request: Request,
  env: Env,
  auth: AuthContext,
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  const rows = await sql(
    `SELECT push_enabled, digest_email_enabled, notification_sound, digest_email_time
     FROM notification_preferences
     WHERE electrician_id = $1`,
    [electricianId]
  )

  if (rows.length === 0) {
    return json({
      push_enabled: true,
      digest_email_enabled: true,
      notification_sound: true,
      digest_email_time: '07:00',
    }, 200, request)
  }

  return json(rows[0], 200, request)
}

/**
 * PUT /api/settings/notifications
 */
export async function handleUpdateNotificationPreferences(
  request: Request,
  env: Env,
  auth: AuthContext,
): Promise<Response> {
  const body = await validateBody(request, preferencesSchema)
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  const fields: string[] = []
  const values: unknown[] = [electricianId]
  let paramIndex = 2

  if (body.push_enabled !== undefined) {
    fields.push(`push_enabled = $${paramIndex++}`)
    values.push(body.push_enabled)
  }
  if (body.digest_email_enabled !== undefined) {
    fields.push(`digest_email_enabled = $${paramIndex++}`)
    values.push(body.digest_email_enabled)
  }
  if (body.notification_sound !== undefined) {
    fields.push(`notification_sound = $${paramIndex++}`)
    values.push(body.notification_sound)
  }
  if (body.digest_email_time !== undefined) {
    fields.push(`digest_email_time = $${paramIndex++}`)
    values.push(body.digest_email_time)
  }

  if (fields.length === 0) {
    return json({ success: true }, 200, request)
  }

  fields.push('updated_at = NOW()')

  await sql(
    `UPDATE notification_preferences SET ${fields.join(', ')} WHERE electrician_id = $1`,
    values
  )

  return json({ success: true }, 200, request)
}
