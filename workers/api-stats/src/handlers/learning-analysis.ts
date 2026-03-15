import { neon } from '@neondatabase/serverless'
import type { Env } from '../index'

interface EditPair {
  message_id: string
  electrician_id: string
  original: string
  edited: string
  job_type: string | null
  created_at: string
}

/**
 * Analyse recent edits across all electricians.
 * When an electrician consistently changes the same type of response,
 * generate a rule suggestion.
 *
 * Runs daily at 03:00 UTC via cron trigger.
 *
 * Logic:
 * 1. Load all edited messages from the last 30 days
 * 2. Group by electrician
 * 3. For each electrician with 2+ edits, send to Claude for pattern analysis
 * 4. If Claude identifies a pattern, create a suggestion
 */
export async function runLearningAnalysis(env: Env): Promise<void> {
  const sql = neon(env.NEON_DATABASE_URL)

  // Get all edited messages from the last 30 days (where approved_content differs from content)
  const edits = await sql(`
    SELECT
      m.id as message_id,
      c.electrician_id,
      m.content as original,
      m.approved_content as edited,
      c.job_type,
      m.created_at
    FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE m.role = 'agent'
      AND m.approved = true
      AND m.approved_content IS NOT NULL
      AND m.approved_content != m.content
      AND m.created_at > now() - interval '30 days'
    ORDER BY c.electrician_id, m.created_at
  `)

  if (edits.length === 0) {
    console.log('No edits to analyse')
    return
  }

  // Group by electrician
  const byElectrician = new Map<string, EditPair[]>()
  for (const edit of edits) {
    const elecId = edit.electrician_id as string
    if (!byElectrician.has(elecId)) {
      byElectrician.set(elecId, [])
    }
    byElectrician.get(elecId)!.push({
      message_id: edit.message_id as string,
      electrician_id: elecId,
      original: edit.original as string,
      edited: edit.edited as string,
      job_type: edit.job_type as string | null,
      created_at: edit.created_at as string,
    })
  }

  // Analyse each electrician with 2+ edits
  for (const [electricianId, editPairs] of byElectrician) {
    if (editPairs.length < 2) continue

    // Check if we already have a pending suggestion for this electrician recently
    const existingSuggestions = await sql(
      `SELECT id FROM agent_rule_suggestions
       WHERE electrician_id = $1 AND status = 'pending'
       AND created_at > now() - interval '7 days'`,
      [electricianId]
    )

    // Don't spam suggestions — max 2 pending at a time
    if (existingSuggestions.length >= 2) continue

    try {
      const suggestion = await analyseEditsWithClaude(env.ANTHROPIC_API_KEY, editPairs)

      if (suggestion) {
        const editIds = editPairs.map((e) => e.message_id)
        await sql(
          `INSERT INTO agent_rule_suggestions (electrician_id, suggestion_text, source_edit_ids, status)
           VALUES ($1, $2, $3, 'pending')`,
          [electricianId, suggestion, editIds]
        )
        console.log(`Created suggestion for electrician ${electricianId}: ${suggestion}`)
      }
    } catch (err) {
      console.error(`Learning analysis failed for electrician ${electricianId}:`, err)
      // Continue with next electrician — don't fail the whole job
    }
  }
}

/**
 * Send edit pairs to Claude for pattern analysis.
 * Returns a suggested rule in plain English, or null if no clear pattern.
 */
async function analyseEditsWithClaude(
  apiKey: string,
  editPairs: EditPair[]
): Promise<string | null> {
  const editsDescription = editPairs
    .map((e, i) => {
      const jobContext = e.job_type ? ` (Job type: ${e.job_type})` : ''
      return `Edit ${i + 1}${jobContext}:\n  Original: "${e.original}"\n  Changed to: "${e.edited}"`
    })
    .join('\n\n')

  const prompt = `You are analysing an electrician's corrections to their AI agent's responses. The electrician reviewed what the agent wrote and changed it before sending to the customer.

Here are the recent edits:

${editsDescription}

Analyse these edits for a consistent pattern. If you see the electrician repeatedly making the same type of change, suggest ONE rule in plain English that the agent should follow going forward.

Rules should be specific and actionable, like:
- "Always mention Part P certification when discussing consumer unit upgrades"
- "Quote £1,000-£1,200 for consumer unit upgrades, not £850-£1,100"
- "Don't offer same-week availability — say 2-3 weeks lead time"
- "Always ask about parking before confirming a visit"

If there's no clear pattern (edits are random/unrelated), respond with exactly: NO_PATTERN

Respond with ONLY the rule text or NO_PATTERN. Nothing else.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Claude API error in learning analysis:', response.status, errorBody)
    return null
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>
  }

  const textBlock = data.content.find((c) => c.type === 'text')
  const result = textBlock?.text?.trim()

  if (!result || result === 'NO_PATTERN') return null

  return result
}
