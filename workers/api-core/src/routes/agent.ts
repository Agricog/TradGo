import { z } from 'zod'
import { neon } from '@neondatabase/serverless'
import type { Env } from '../index'
import type { AuthContext } from '../middleware/auth'
import { json, AppError } from '../utils/errors'
import { validateBody } from '../utils/validation'

// ===========================================
// Schemas
// ===========================================

const statusSchema = z.object({
  status: z.enum(['live', 'paused']),
})

const ruleSchema = z.object({
  rule_text: z.string().min(3).max(500),
})

const suggestionActionSchema = z.object({
  action: z.enum(['accept', 'dismiss']),
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
// Agent Status
// ===========================================

/**
 * GET /api/agent/status — Get current agent status
 */
export async function handleGetAgentStatus(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const rows = await sql(
    'SELECT agent_status, first_name, phone FROM electricians WHERE clerk_id = $1',
    [auth.userId]
  )

  if (rows.length === 0) throw new AppError('Not found', 404)

  return json({
    status: rows[0].agent_status,
    offline_message: `${rows[0].first_name}'s agent is currently offline. You can reach ${rows[0].first_name} directly on ${rows[0].phone}.`,
  }, 200, request)
}

/**
 * PUT /api/agent/status — Toggle agent live/paused
 */
export async function handleUpdateAgentStatus(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  const data = await validateBody(request, statusSchema)
  const sql = neon(env.NEON_DATABASE_URL)

  await sql(
    'UPDATE electricians SET agent_status = $1 WHERE clerk_id = $2',
    [data.status, auth.userId]
  )

  return json({ success: true, status: data.status }, 200, request)
}

// ===========================================
// Agent Rules
// ===========================================

/**
 * GET /api/agent/rules — List all active rules
 */
export async function handleGetRules(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  const rows = await sql(
    'SELECT id, rule_text, source, active, created_at FROM agent_rules WHERE electrician_id = $1 ORDER BY created_at',
    [electricianId]
  )

  return json({ rules: rows }, 200, request)
}

/**
 * POST /api/agent/rules — Add a new rule
 */
export async function handleCreateRule(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  const data = await validateBody(request, ruleSchema)
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  // Check rule count (max 30)
  const count = await sql(
    'SELECT COUNT(*) as count FROM agent_rules WHERE electrician_id = $1 AND active = true',
    [electricianId]
  )

  if ((count[0].count as number) >= 30) {
    throw new AppError('Maximum 30 active rules allowed', 400, 'RULE_LIMIT')
  }

  const rows = await sql(
    `INSERT INTO agent_rules (electrician_id, rule_text, source, active)
     VALUES ($1, $2, 'manual', true) RETURNING id, rule_text, source, active, created_at`,
    [electricianId, data.rule_text]
  )

  return json({ rule: rows[0] }, 201, request)
}

/**
 * PUT /api/agent/rules/:id — Update a rule
 */
export async function handleUpdateRule(
  request: Request,
  env: Env,
  auth: AuthContext,
  params: Record<string, string>
): Promise<Response> {
  const data = await validateBody(request, ruleSchema)
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  const result = await sql(
    `UPDATE agent_rules SET rule_text = $1
     WHERE id = $2 AND electrician_id = $3
     RETURNING id, rule_text, source, active, created_at`,
    [data.rule_text, params.id, electricianId]
  )

  if (result.length === 0) throw new AppError('Rule not found', 404)

  return json({ rule: result[0] }, 200, request)
}

/**
 * DELETE /api/agent/rules/:id — Delete a rule
 */
export async function handleDeleteRule(
  request: Request,
  env: Env,
  auth: AuthContext,
  params: Record<string, string>
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  const result = await sql(
    'DELETE FROM agent_rules WHERE id = $1 AND electrician_id = $2 RETURNING id',
    [params.id, electricianId]
  )

  if (result.length === 0) throw new AppError('Rule not found', 404)

  return json({ success: true }, 200, request)
}

// ===========================================
// Agent Suggestions
// ===========================================

/**
 * GET /api/agent/suggestions — List pending suggestions
 */
export async function handleGetSuggestions(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  const rows = await sql(
    `SELECT id, suggestion_text, created_at FROM agent_rule_suggestions
     WHERE electrician_id = $1 AND status = 'pending'
     ORDER BY created_at DESC`,
    [electricianId]
  )

  return json({ suggestions: rows }, 200, request)
}

/**
 * POST /api/agent/suggestions/:id — Accept or dismiss a suggestion
 */
export async function handleSuggestionAction(
  request: Request,
  env: Env,
  auth: AuthContext,
  params: Record<string, string>
): Promise<Response> {
  const data = await validateBody(request, suggestionActionSchema)
  const sql = neon(env.NEON_DATABASE_URL)
  const electricianId = await getElectricianId(sql, auth.userId)

  if (data.action === 'accept') {
    // Get the suggestion text
    const suggestion = await sql(
      `SELECT suggestion_text FROM agent_rule_suggestions
       WHERE id = $1 AND electrician_id = $2 AND status = 'pending'`,
      [params.id, electricianId]
    )

    if (suggestion.length === 0) throw new AppError('Suggestion not found', 404)

    // Create a new rule from the suggestion
    await sql(
      `INSERT INTO agent_rules (electrician_id, rule_text, source, active)
       VALUES ($1, $2, 'suggested_from_edit', true)`,
      [electricianId, suggestion[0].suggestion_text]
    )

    // Mark suggestion as accepted
    await sql(
      `UPDATE agent_rule_suggestions SET status = 'accepted' WHERE id = $1`,
      [params.id]
    )
  } else {
    // Dismiss
    await sql(
      `UPDATE agent_rule_suggestions SET status = 'dismissed'
       WHERE id = $1 AND electrician_id = $2`,
      [params.id, electricianId]
    )
  }

  return json({ success: true, action: data.action }, 200, request)
}
