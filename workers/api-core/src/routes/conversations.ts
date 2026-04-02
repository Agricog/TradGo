import { z } from 'zod'
import { neon } from '@neondatabase/serverless'
import type { Env } from '../index'
import type { AuthContext } from '../middleware/auth'
import { json, AppError } from '../utils/errors'
import { validateBody } from '../utils/validation'
import { sendApprovedMessage, sendSms } from '../utils/twilio'

// ===========================================
// Schemas
// ===========================================

const editSchema = z.object({
  content: z.string().min(1).max(1000),
})

const replySchema = z.object({
  content: z.string().min(1).max(1000),
})

// ===========================================
// Helpers
// ===========================================

async function getElectricianId(sql: ReturnType<typeof neon>, clerkId: string): Promise<string> {
  const rows = await sql('SELECT id FROM electricians WHERE clerk_id = $1', [clerkId])
  if (rows.length === 0) throw new AppError('Electrician not found', 404)
  return rows[0].id as string
}

async function verifyConversationOwnership(
  sql: ReturnType<typeof neon>,
  conversationId: string,
  electricianId: string
): Promise<void> {
  const rows = await sql(
    'SELECT id FROM conversations WHERE id = $1 AND electrician_id = $2',
    [conversationId, electricianId]
  )
  if (rows.length === 0) throw new AppError('Conversation not found', 404)
}

// ===========================================
// Handlers
// ===========================================

/**
 * GET /api/conversations — List conversations for the electrician
 */
export async function handleListConversations(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  const url = new URL(request.url)
  const status = url.searchParams.get('status') // active, awaiting_approval, escalated, completed
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
  const offset = parseInt(url.searchParams.get('offset') || '0')

  let query = `
    SELECT c.*,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
      (SELECT role FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_role,
      (SELECT inbox_summary FROM messages WHERE conversation_id = c.id AND inbox_summary IS NOT NULL ORDER BY created_at DESC LIMIT 1) as latest_summary,
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
    FROM conversations c
    WHERE c.electrician_id = $1`

  const params: unknown[] = [electricianId]
  let paramIndex = 2

  if (status) {
    query += ` AND c.status = $${paramIndex++}`
    params.push(status)
  }

  // Priority sort: escalated → awaiting_approval → active → completed
  query += ` ORDER BY
    CASE c.status
      WHEN 'escalated' THEN 1
      WHEN 'awaiting_approval' THEN 2
      WHEN 'active' THEN 3
      WHEN 'completed' THEN 4
      WHEN 'archived' THEN 5
    END,
    c.updated_at DESC
  LIMIT $${paramIndex++} OFFSET $${paramIndex++}`

  params.push(limit, offset)

  const rows = await sql(query, params)

  return json({ conversations: rows }, 200, request)
}

/**
 * GET /api/conversations/:id — Full conversation with messages
 */
export async function handleGetConversation(
  request: Request,
  env: Env,
  auth: AuthContext,
  params: Record<string, string>
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)
  const conversationId = params.id

  await verifyConversationOwnership(sql, conversationId, electricianId)

  const convRows = await sql('SELECT * FROM conversations WHERE id = $1', [conversationId])
  const messages = await sql(
    'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [conversationId]
  )

  return json({ conversation: convRows[0], messages }, 200, request)
}

/**
 * POST /api/conversations/:id/approve — Approve and send a pending agent message
 */
export async function handleApprove(
  request: Request,
  env: Env,
  auth: AuthContext,
  params: Record<string, string>
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)
  const conversationId = params.id

  await verifyConversationOwnership(sql, conversationId, electricianId)

  // Find the pending message
  const pending = await sql(
    `SELECT id, content FROM messages
     WHERE conversation_id = $1 AND role = 'agent' AND classification = 'needs_approval' AND sent = false
     ORDER BY created_at DESC LIMIT 1`,
    [conversationId]
  )

  if (pending.length === 0) {
    throw new AppError('No pending message to approve', 400)
  }

  const messageId = pending[0].id as string
  const content = pending[0].content as string

  // Mark as approved
  await sql(
    `UPDATE messages SET approved = true, approved_content = $1 WHERE id = $2`,
    [content, messageId]
  )

  // Send via Twilio
  const sent = await sendApprovedMessage(
    sql, env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN, messageId, content
  )

  if (!sent) {
    throw new AppError('Failed to send message', 500)
  }

  // Update conversation status back to active
  await sql(
    `UPDATE conversations SET status = 'active' WHERE id = $1`,
    [conversationId]
  )

  return json({ success: true, sent: true }, 200, request)
}

/**
 * POST /api/conversations/:id/edit — Edit and send a pending message
 */
export async function handleEdit(
  request: Request,
  env: Env,
  auth: AuthContext,
  params: Record<string, string>
): Promise<Response> {
  const data = await validateBody(request, editSchema)
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)
  const conversationId = params.id

  await verifyConversationOwnership(sql, conversationId, electricianId)

  // Find the pending message
  const pending = await sql(
    `SELECT id, content FROM messages
     WHERE conversation_id = $1 AND role = 'agent' AND classification = 'needs_approval' AND sent = false
     ORDER BY created_at DESC LIMIT 1`,
    [conversationId]
  )

  if (pending.length === 0) {
    throw new AppError('No pending message to edit', 400)
  }

  const messageId = pending[0].id as string

  // Store both original and edited content (for learning loop)
  await sql(
    `UPDATE messages SET approved = true, approved_content = $1 WHERE id = $2`,
    [data.content, messageId]
  )

  // Send edited version via Twilio
  const sent = await sendApprovedMessage(
    sql, env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN, messageId, data.content
  )

  if (!sent) {
    throw new AppError('Failed to send message', 500)
  }

  // Update conversation status
  await sql(
    `UPDATE conversations SET status = 'active' WHERE id = $1`,
    [conversationId]
  )

  return json({ success: true, sent: true, edited: true }, 200, request)
}

/**
 * POST /api/conversations/:id/reject — Reject a pending message
 */
export async function handleReject(
  request: Request,
  env: Env,
  auth: AuthContext,
  params: Record<string, string>
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)
  const conversationId = params.id

  await verifyConversationOwnership(sql, conversationId, electricianId)

  // Mark pending message as rejected
  await sql(
    `UPDATE messages SET approved = false
     WHERE conversation_id = $1 AND role = 'agent' AND classification = 'needs_approval' AND sent = false`,
    [conversationId]
  )

  // Update conversation status back to active
  await sql(
    `UPDATE conversations SET status = 'active' WHERE id = $1`,
    [conversationId]
  )

  return json({ success: true }, 200, request)
}

/**
 * POST /api/conversations/:id/reply — Electrician sends a manual reply
 * Agent pauses for this conversation for 24 hours.
 */
export async function handleReply(
  request: Request,
  env: Env,
  auth: AuthContext,
  params: Record<string, string>
): Promise<Response> {
  const data = await validateBody(request, replySchema)
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)
  const conversationId = params.id

  await verifyConversationOwnership(sql, conversationId, electricianId)

  // Get conversation details for sending
  const convRows = await sql(
    `SELECT c.customer_phone, e.twilio_number
     FROM conversations c
     JOIN electricians e ON c.electrician_id = e.id
     WHERE c.id = $1`,
    [conversationId]
  )

  if (convRows.length === 0) throw new AppError('Conversation not found', 404)

  const customerPhone = convRows[0].customer_phone as string
  const twilioNumber = convRows[0].twilio_number as string

  if (!customerPhone || !twilioNumber) {
    throw new AppError('Cannot send — missing phone number', 400)
  }

  // Send via Twilio
  const result = await sendSms(
    env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN,
    twilioNumber, customerPhone, data.content
  )

  if (!result.success) {
    throw new AppError(`Failed to send: ${result.error}`, 500)
  }

  // Store the electrician's message
  await sql(
    `INSERT INTO messages (conversation_id, role, content, classification, sent, sent_at)
     VALUES ($1, 'electrician', $2, 'safe', true, now())`,
    [conversationId, data.content]
  )

  // Pause agent for 24 hours on this conversation
  const pauseUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  await sql(
    `UPDATE conversations SET status = 'active', agent_paused_until = $1 WHERE id = $2`,
    [pauseUntil, conversationId]
  )

  return json({ success: true, sent: true }, 200, request)
}

/**
 * POST /api/conversations/:id/complete — Mark conversation as completed
 * Optionally sends a Google review request SMS to the customer.
 */
export async function handleComplete(
  request: Request,
  env: Env,
  auth: AuthContext,
  params: Record<string, string>
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)
  const conversationId = params.id

  await verifyConversationOwnership(sql, conversationId, electricianId)

  // Mark conversation as completed
  await sql(
    `UPDATE conversations SET status = 'completed', job_status = 'completed' WHERE id = $1`,
    [conversationId]
  )

  // Check if electrician has a Google review URL and conversation has a customer phone
  const rows = await sql(
    `SELECT e.first_name, e.business_name, e.google_review_url, e.twilio_number,
            c.customer_phone, c.customer_name
     FROM electricians e
     JOIN conversations c ON c.electrician_id = e.id
     WHERE c.id = $1 AND e.id = $2`,
    [conversationId, electricianId]
  )

  if (rows.length === 0) {
    return json({ success: true, review_sent: false }, 200, request)
  }

  const elec = rows[0]
  const reviewUrl = elec.google_review_url as string | null
  const customerPhone = elec.customer_phone as string | null
  const twilioNumber = elec.twilio_number as string | null
  const firstName = elec.first_name as string
  const businessName = elec.business_name as string | null
  const customerName = elec.customer_name as string | null

  // Only send review request if we have all the pieces
  if (!reviewUrl || !customerPhone || !twilioNumber) {
    return json({ success: true, review_sent: false }, 200, request)
  }

  const displayName = businessName || `${firstName}'s Electrical`
  const greeting = customerName ? `Hi ${customerName}` : 'Hi'

  const reviewMessage =
    `${greeting}, thanks for choosing ${displayName}. ` +
    `If you were happy with the work, a quick Google review would really help us out — ` +
    `it only takes 30 seconds. ${reviewUrl}`

  const result = await sendSms(
    env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN,
    twilioNumber, customerPhone, reviewMessage
  )

  if (result.success) {
    await sql(
      `UPDATE conversations SET job_status = 'review_requested' WHERE id = $1`,
      [conversationId]
    )
  }

  return json({ success: true, review_sent: result.success }, 200, request)
}
