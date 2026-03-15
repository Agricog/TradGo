import { neon } from '@neondatabase/serverless'
import type { Env } from '../index'
import type { AuthContext } from '../middleware/auth'
import { json, AppError } from '../utils/errors'

/**
 * GET /api/stats/summary?period=week|month|all
 * Returns stats for the electrician's dashboard.
 */
export async function handleStatsSummary(
  request: Request,
  env: Env,
  auth: AuthContext
): Promise<Response> {
  const sql = neon(env.NEON_DATABASE_URL)

  const elecRows = await sql('SELECT id FROM electricians WHERE clerk_id = $1', [auth.userId])
  if (elecRows.length === 0) throw new AppError('Not found', 404)
  const electricianId = elecRows[0].id as string

  const url = new URL(request.url)
  const period = url.searchParams.get('period') || 'week'

  // Determine date range
  const now = new Date()
  let startDate: Date

  if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  } else if (period === 'all') {
    startDate = new Date(2020, 0, 1) // Far enough back
  } else {
    // Default: this week (Monday)
    const dayOfWeek = now.getUTCDay()
    startDate = new Date(now)
    startDate.setUTCDate(now.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    startDate.setUTCHours(0, 0, 0, 0)
  }

  const startIso = startDate.toISOString()

  // Get live stats (not from cache, for real-time accuracy)
  const enquiries = await sql(
    'SELECT COUNT(*) as count FROM conversations WHERE electrician_id = $1 AND created_at >= $2',
    [electricianId, startIso]
  )

  const completed = await sql(
    `SELECT COUNT(*) as count FROM conversations WHERE electrician_id = $1 AND status = 'completed' AND updated_at >= $2`,
    [electricianId, startIso]
  )

  const estimates = await sql(
    `SELECT COUNT(*) as count FROM messages m
     JOIN conversations c ON m.conversation_id = c.id
     WHERE c.electrician_id = $1 AND m.classification = 'needs_approval' AND m.approved = true AND m.sent = true AND m.sent_at >= $2`,
    [electricianId, startIso]
  )

  const visits = await sql(
    'SELECT COUNT(*) as count FROM conversations WHERE electrician_id = $1 AND visit_confirmed = true AND updated_at >= $2',
    [electricianId, startIso]
  )

  const approvalStats = await sql(
    `SELECT
       COUNT(*) FILTER (WHERE approved = true) as total_approved,
       COUNT(*) FILTER (WHERE approved = true AND (approved_content IS NULL OR approved_content = content)) as without_edit
     FROM messages m
     JOIN conversations c ON m.conversation_id = c.id
     WHERE c.electrician_id = $1 AND m.classification = 'needs_approval' AND m.created_at >= $2`,
    [electricianId, startIso]
  )

  const estimatedValue = await sql(
    'SELECT SUM(estimate_from) as low, SUM(estimate_to) as high FROM conversations WHERE electrician_id = $1 AND visit_confirmed = true AND updated_at >= $2',
    [electricianId, startIso]
  )

  const totalApproved = Number(approvalStats[0]?.total_approved) || 0
  const withoutEdit = Number(approvalStats[0]?.without_edit) || 0

  return json({
    period,
    enquiries_count: Number(enquiries[0]?.count) || 0,
    completed_count: Number(completed[0]?.count) || 0,
    estimates_sent: Number(estimates[0]?.count) || 0,
    visits_booked: Number(visits[0]?.count) || 0,
    approval_rate: totalApproved > 0 ? Math.round((withoutEdit / totalApproved) * 100) : null,
    estimated_value_low: estimatedValue[0]?.low ? Number(estimatedValue[0].low) : null,
    estimated_value_high: estimatedValue[0]?.high ? Number(estimatedValue[0].high) : null,
  }, 200, request)
}
