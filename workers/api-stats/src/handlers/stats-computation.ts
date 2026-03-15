import { neon } from '@neondatabase/serverless'
import type { Env } from '../index'

/**
 * Compute weekly stats for all active electricians.
 * Writes to weekly_stats_cache table for fast dashboard reads.
 *
 * Runs daily at 03:00 UTC via cron trigger.
 * Computes stats for the current week (Monday–Sunday).
 */
export async function computeWeeklyStats(env: Env): Promise<void> {
  const sql = neon(env.NEON_DATABASE_URL)

  // Get current week boundaries (Monday to Sunday)
  const now = new Date()
  const dayOfWeek = now.getUTCDay() // 0 = Sunday
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  monday.setUTCHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setUTCDate(monday.getUTCDate() + 6)
  sunday.setUTCHours(23, 59, 59, 999)

  const periodStart = monday.toISOString().split('T')[0]
  const periodEnd = sunday.toISOString().split('T')[0]

  // Get all active electricians
  const electricians = await sql(
    `SELECT id FROM electricians WHERE agent_status IN ('live', 'paused')`
  )

  for (const elec of electricians) {
    const electricianId = elec.id as string

    try {
      // Enquiries handled (new conversations this week)
      const enquiries = await sql(
        `SELECT COUNT(*) as count FROM conversations
         WHERE electrician_id = $1 AND created_at >= $2 AND created_at <= $3`,
        [electricianId, monday.toISOString(), sunday.toISOString()]
      )

      // Completed conversations
      const completed = await sql(
        `SELECT COUNT(*) as count FROM conversations
         WHERE electrician_id = $1 AND status = 'completed'
         AND updated_at >= $2 AND updated_at <= $3`,
        [electricianId, monday.toISOString(), sunday.toISOString()]
      )

      // Estimates sent (approved messages with needs_approval classification)
      const estimates = await sql(
        `SELECT COUNT(*) as count FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.electrician_id = $1
         AND m.classification = 'needs_approval' AND m.approved = true AND m.sent = true
         AND m.sent_at >= $2 AND m.sent_at <= $3`,
        [electricianId, monday.toISOString(), sunday.toISOString()]
      )

      // Visits booked
      const visits = await sql(
        `SELECT COUNT(*) as count FROM conversations
         WHERE electrician_id = $1 AND visit_confirmed = true
         AND updated_at >= $2 AND updated_at <= $3`,
        [electricianId, monday.toISOString(), sunday.toISOString()]
      )

      // Average response time (agent messages this week)
      const responseTime = await sql(
        `SELECT AVG(EXTRACT(EPOCH FROM (m_agent.created_at - m_customer.created_at))) as avg_seconds
         FROM messages m_agent
         JOIN messages m_customer ON m_customer.conversation_id = m_agent.conversation_id
           AND m_customer.role = 'customer'
           AND m_customer.created_at = (
             SELECT MAX(created_at) FROM messages
             WHERE conversation_id = m_agent.conversation_id
             AND role = 'customer'
             AND created_at < m_agent.created_at
           )
         JOIN conversations c ON m_agent.conversation_id = c.id
         WHERE c.electrician_id = $1
         AND m_agent.role = 'agent'
         AND m_agent.created_at >= $2 AND m_agent.created_at <= $3`,
        [electricianId, monday.toISOString(), sunday.toISOString()]
      )

      // Approval rate (approved without edit / total approved)
      const approvalStats = await sql(
        `SELECT
           COUNT(*) FILTER (WHERE approved = true) as total_approved,
           COUNT(*) FILTER (WHERE approved = true AND (approved_content IS NULL OR approved_content = content)) as approved_without_edit
         FROM messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE c.electrician_id = $1
         AND m.classification = 'needs_approval'
         AND m.created_at >= $2 AND m.created_at <= $3`,
        [electricianId, monday.toISOString(), sunday.toISOString()]
      )

      // Estimated value of booked visits
      const estimatedValue = await sql(
        `SELECT
           SUM(estimate_from) as value_low,
           SUM(estimate_to) as value_high
         FROM conversations
         WHERE electrician_id = $1 AND visit_confirmed = true
         AND updated_at >= $2 AND updated_at <= $3`,
        [electricianId, monday.toISOString(), sunday.toISOString()]
      )

      const totalApproved = Number(approvalStats[0]?.total_approved) || 0
      const approvedWithoutEdit = Number(approvalStats[0]?.approved_without_edit) || 0
      const approvalRate = totalApproved > 0
        ? Math.round((approvedWithoutEdit / totalApproved) * 100)
        : null

      // Upsert into weekly_stats_cache
      await sql(
        `INSERT INTO weekly_stats_cache (
           electrician_id, period_start, period_end,
           enquiries_count, completed_count, estimates_sent, visits_booked,
           avg_response_seconds, approval_rate,
           estimated_value_low, estimated_value_high
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (electrician_id, period_start) DO UPDATE SET
           enquiries_count = EXCLUDED.enquiries_count,
           completed_count = EXCLUDED.completed_count,
           estimates_sent = EXCLUDED.estimates_sent,
           visits_booked = EXCLUDED.visits_booked,
           avg_response_seconds = EXCLUDED.avg_response_seconds,
           approval_rate = EXCLUDED.approval_rate,
           estimated_value_low = EXCLUDED.estimated_value_low,
           estimated_value_high = EXCLUDED.estimated_value_high`,
        [
          electricianId,
          periodStart,
          periodEnd,
          Number(enquiries[0]?.count) || 0,
          Number(completed[0]?.count) || 0,
          Number(estimates[0]?.count) || 0,
          Number(visits[0]?.count) || 0,
          responseTime[0]?.avg_seconds ? Math.round(Number(responseTime[0].avg_seconds)) : null,
          approvalRate,
          estimatedValue[0]?.value_low ? Number(estimatedValue[0].value_low) : null,
          estimatedValue[0]?.value_high ? Number(estimatedValue[0].value_high) : null,
        ]
      )

      console.log(`Stats computed for electrician ${electricianId}: ${Number(enquiries[0]?.count)} enquiries this week`)
    } catch (err) {
      console.error(`Stats computation failed for electrician ${electricianId}:`, err)
      // Continue with next electrician
    }
  }
}
