import { neon } from '@neondatabase/serverless'

interface RetentionEnv {
  NEON_DATABASE_URL: string
}

/**
 * Data retention job — runs weekly via cron.
 *
 * 1. Archive conversations older than 90 days (keep metadata, clear message content)
 * 2. Delete archived conversations older than 12 months
 * 3. Skip conversations linked to booked jobs (visit_confirmed = true)
 */
export async function runDataRetention(env: RetentionEnv): Promise<void> {
  const sql = neon(env.NEON_DATABASE_URL)

  // 1. Archive conversations older than 90 days
  const archived = await sql(`
    UPDATE conversations
    SET status = 'archived', updated_at = NOW()
    WHERE status != 'archived'
      AND created_at < NOW() - INTERVAL '90 days'
      AND visit_confirmed = false
    RETURNING id
  `)
  console.log(`Archived ${archived.length} conversations older than 90 days`)

  // 2. Clear message content from archived conversations older than 90 days
  // Keep the metadata (role, classification, timestamps) but clear the actual content
  const cleared = await sql(`
    UPDATE messages
    SET content = '[archived]', approved_content = NULL
    WHERE conversation_id IN (
      SELECT id FROM conversations
      WHERE status = 'archived'
        AND created_at < NOW() - INTERVAL '90 days'
        AND visit_confirmed = false
    )
    AND content != '[archived]'
  `)
  console.log(`Cleared content from ${cleared.length} messages in archived conversations`)

  // 3. Delete conversations and messages older than 12 months
  const deleted = await sql(`
    DELETE FROM messages
    WHERE conversation_id IN (
      SELECT id FROM conversations
      WHERE status = 'archived'
        AND created_at < NOW() - INTERVAL '12 months'
        AND visit_confirmed = false
    )
    RETURNING id
  `)
  console.log(`Deleted ${deleted.length} messages from expired conversations`)

  const deletedConvos = await sql(`
    DELETE FROM conversations
    WHERE status = 'archived'
      AND created_at < NOW() - INTERVAL '12 months'
      AND visit_confirmed = false
    RETURNING id
  `)
  console.log(`Deleted ${deletedConvos.length} expired conversations`)
}
