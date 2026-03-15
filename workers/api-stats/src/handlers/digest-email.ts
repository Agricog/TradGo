import { neon } from '@neondatabase/serverless'

interface DigestEnv {
  NEON_DATABASE_URL: string
  RESEND_API_KEY: string
  APP_URL?: string
}

/**
 * Daily digest email — runs at 07:00 UTC via cron trigger.
 * Sends each electrician a summary of yesterday's activity.
 * Only sends if there was activity or pending approvals.
 */
export async function sendDailyDigest(env: DigestEnv): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping digest emails')
    return
  }

  const sql = neon(env.NEON_DATABASE_URL)
  const appUrl = env.APP_URL || 'https://tradgo.co.uk'

  // Get all active electricians with digest enabled
  const electricians = await sql(`
    SELECT e.id, e.first_name, e.email
    FROM electricians e
    JOIN notification_preferences np ON np.electrician_id = e.id
    WHERE e.agent_status = 'live'
      AND np.digest_email_enabled = true
      AND e.email IS NOT NULL
  `)

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const elec of electricians) {
    try {
      // Yesterday's activity
      const [activity] = await sql(
        `SELECT
          COUNT(*) FILTER (WHERE created_at >= $2 AND created_at < $3) as new_enquiries,
          COUNT(*) FILTER (WHERE status = 'completed' AND updated_at >= $2 AND updated_at < $3) as completed,
          COUNT(*) FILTER (WHERE estimate_approved = true AND updated_at >= $2 AND updated_at < $3) as estimates_approved,
          COUNT(*) FILTER (WHERE visit_confirmed = true AND updated_at >= $2 AND updated_at < $3) as visits_booked,
          COUNT(*) FILTER (WHERE status = 'awaiting_approval') as pending_approvals
        FROM conversations
        WHERE electrician_id = $1`,
        [elec.id, yesterday.toISOString(), today.toISOString()]
      )

      const enquiries = Number(activity.new_enquiries)
      const completed = Number(activity.completed)
      const estimatesApproved = Number(activity.estimates_approved)
      const visitsBooked = Number(activity.visits_booked)
      const pending = Number(activity.pending_approvals)

      // Only send if there's something to report
      if (enquiries === 0 && completed === 0 && pending === 0) continue

      // Build email
      const lines: string[] = []
      lines.push(`Hi ${elec.first_name},`)
      lines.push('')

      if (enquiries > 0 || completed > 0 || visitsBooked > 0) {
        lines.push('Yesterday your agent:')
        if (enquiries > 0) lines.push(`  - Handled ${enquiries} new ${enquiries === 1 ? 'enquiry' : 'enquiries'}`)
        if (estimatesApproved > 0) lines.push(`  - Sent ${estimatesApproved} ${estimatesApproved === 1 ? 'estimate' : 'estimates'}`)
        if (visitsBooked > 0) lines.push(`  - Booked ${visitsBooked} ${visitsBooked === 1 ? 'visit' : 'visits'}`)
        if (completed > 0) lines.push(`  - Completed ${completed} ${completed === 1 ? 'conversation' : 'conversations'}`)
      } else {
        lines.push('No new activity yesterday, but your agent is still live and ready.')
      }

      if (pending > 0) {
        lines.push('')
        lines.push(`You've got ${pending} ${pending === 1 ? 'conversation' : 'conversations'} waiting for your approval.`)
      }

      lines.push('')
      lines.push(`Open your inbox: ${appUrl}/dashboard`)
      lines.push('')
      lines.push('— Your TradGo agent')

      const subject = visitsBooked > 0
        ? `Your agent yesterday — ${enquiries} ${enquiries === 1 ? 'enquiry' : 'enquiries'}, ${visitsBooked} ${visitsBooked === 1 ? 'visit' : 'visits'} booked`
        : enquiries > 0
          ? `Your agent yesterday — ${enquiries} ${enquiries === 1 ? 'enquiry' : 'enquiries'} handled`
          : `You've got ${pending} ${pending === 1 ? 'conversation' : 'conversations'} waiting`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'TradGo <agent@tradgo.co.uk>',
          to: [elec.email],
          subject,
          text: lines.join('\n'),
        }),
      })

      console.log(`Digest sent to ${elec.email}: ${enquiries} enquiries, ${visitsBooked} visits`)
    } catch (err) {
      console.error(`Digest failed for electrician ${elec.id}:`, err)
      // Continue with next electrician
    }
  }
}
