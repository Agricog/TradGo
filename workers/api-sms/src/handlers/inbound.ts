import { neon } from '@neondatabase/serverless'
import type { Env, Channel } from '../index'
import { buildSystemPrompt, type ElectricianProfile } from './prompt-builder'
import { parseAgentResponse } from './classifier'
import { checkConversationRate, checkElectricianDailyRate } from './rate-limiter'

/**
 * Handle an inbound message from Twilio (SMS or WhatsApp).
 * Phone numbers should already have the whatsapp: prefix stripped.
 * Returns TwiML response string.
 */
export async function handleInboundMessage(
  env: Env,
  from: string,
  to: string,
  messageBody: string,
  channel: Channel
): Promise<string> {
  const sql = neon(env.NEON_DATABASE_URL)

  // 1. Identify electrician by Twilio number or WhatsApp number
  const elecRows = await sql(
    `SELECT id, first_name, business_name, phone, agent_status
     FROM electricians WHERE twilio_number = $1 OR whatsapp_number = $1`,
    [to]
  )

  if (elecRows.length === 0) {
    console.error(`No electrician found for number: ${to} (channel: ${channel})`)
    return twiml('Sorry, this number is not currently active.')
  }

  const electrician = elecRows[0]
  const electricianId = electrician.id as string

  // 2. Check if agent is paused
  if (electrician.agent_status === 'paused') {
    const name = electrician.first_name as string
    const phone = electrician.phone as string
    return twiml(
      `${name}'s agent is currently offline. You can reach ${name} directly on ${phone}.`
    )
  }

  // 3. Find or create conversation
  let conversationId: string

  const existingConv = await sql(
    `SELECT id, agent_paused_until FROM conversations
     WHERE electrician_id = $1 AND customer_phone = $2
     AND status IN ('active', 'awaiting_approval')
     ORDER BY created_at DESC LIMIT 1`,
    [electricianId, from]
  )

  if (existingConv.length > 0) {
    conversationId = existingConv[0].id as string

    // Check if agent is paused for this conversation (electrician took over)
    const pausedUntil = existingConv[0].agent_paused_until as string | null
    if (pausedUntil && new Date(pausedUntil) > new Date()) {
      await storeMessage(sql, conversationId, 'customer', messageBody)
      return '<Response></Response>'
    }
  } else {
    // Rate check: new conversations per electrician per day
    const dailyRate = checkElectricianDailyRate(electricianId)
    if (!dailyRate.allowed) {
      return twiml('Sorry, this agent is currently busy. Please try again later.')
    }

    const newConv = await sql(
      `INSERT INTO conversations (electrician_id, channel, customer_phone, status)
       VALUES ($1, $2, $3, 'active') RETURNING id`,
      [electricianId, channel, from]
    )
    conversationId = newConv[0].id as string
  }

  // Rate check: messages per conversation per hour
  const convRate = checkConversationRate(conversationId)
  if (!convRate.allowed) {
    return twiml("Let's slow down a bit — you can send another message shortly.")
  }

  // 4. Store customer message
  await storeMessage(sql, conversationId, 'customer', messageBody)

  // 4.5 Emergency pre-check
  if (isEmergencyMessage(messageBody)) {
    const name = electrician.first_name as string
    const phone = electrician.phone as string

    const emergencyResponse = `That sounds like it could be serious. Please don't touch anything electrical — if you're worried, call 999. For a callout, ring ${name} directly on ${phone} and he'll sort you out as quick as he can.`

    await storeMessage(sql, conversationId, 'agent', emergencyResponse, 'escalate', 'EMERGENCY — customer reports potential electrical danger')
    await sql(
      `UPDATE conversations SET status = 'escalated', escalation_reason = 'Emergency keywords detected' WHERE id = $1`,
      [conversationId]
    )

    return twiml(emergencyResponse)
  }

  // 5. Load full electrician profile
  const profile = await loadElectricianProfile(sql, electricianId)

  // 6. Load conversation history (last 10 messages for context)
  const history = await sql(
    `SELECT role, content FROM messages
     WHERE conversation_id = $1
     ORDER BY created_at ASC
     LIMIT 10`,
    [conversationId]
  )

  // 7. Build prompt and call Claude
  const systemPrompt = buildSystemPrompt(profile)

  const messages = history.map((m) => ({
    role: m.role === 'customer' ? 'user' : 'assistant',
    content: m.content as string,
  }))

  const agentRawResponse = await callClaude(env.ANTHROPIC_API_KEY, systemPrompt, messages)

  // 8. Parse and classify
  const parsed = parseAgentResponse(agentRawResponse)

  // 9. Update conversation with extracted data
  if (parsed.extracted) {
    await updateConversationData(sql, conversationId, parsed.extracted)
  }

  // 10. Route based on classification
  if (parsed.classification === 'escalate') {
    await storeMessage(sql, conversationId, 'agent', parsed.response, 'escalate', parsed.inboxSummary)
    await sql(
      `UPDATE conversations SET status = 'escalated', escalation_reason = $1 WHERE id = $2`,
      [parsed.inboxSummary || 'Escalated by agent', conversationId]
    )

    const name = profile.first_name
    const phone = profile.phone
    return twiml(
      `${name} will get back to you directly on this. If it's urgent, you can call on ${phone}.`
    )
  }

  if (parsed.classification === 'needs_approval') {
    await storeMessage(sql, conversationId, 'agent', parsed.response, 'needs_approval', parsed.inboxSummary)
    await sql(
      `UPDATE conversations SET status = 'awaiting_approval' WHERE id = $1`,
      [conversationId]
    )

    const name = profile.first_name
    return twiml(
      `${name}'s agent is checking on this — you'll hear back shortly.`
    )
  }

  // SAFE — send immediately
  await storeMessage(sql, conversationId, 'agent', parsed.response, 'safe', parsed.inboxSummary, true)

  return twiml(parsed.response)
}

// ===========================================
// Helpers
// ===========================================

function twiml(message: string): string {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<Response><Message>${escaped}</Message></Response>`
}

const EMERGENCY_KEYWORDS = [
  'burning', 'fire', 'smoke', 'electrocuted', 'electric shock',
  'sparking', 'dangerous', 'smell burning', 'on fire', 'emergency', 'arcing',
]

function isEmergencyMessage(text: string): boolean {
  const lower = text.toLowerCase()
  return EMERGENCY_KEYWORDS.some((keyword) => lower.includes(keyword))
}

async function storeMessage(
  sql: ReturnType<typeof neon>,
  conversationId: string,
  role: string,
  content: string,
  classification?: string,
  inboxSummary?: string,
  sent?: boolean
): Promise<void> {
  await sql(
    `INSERT INTO messages (conversation_id, role, content, classification, inbox_summary, sent, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [conversationId, role, content, classification || null, inboxSummary || null, sent || false, sent ? new Date().toISOString() : null]
  )
}

async function loadElectricianProfile(
  sql: ReturnType<typeof neon>,
  electricianId: string
): Promise<ElectricianProfile> {
  const elecRows = await sql(
    'SELECT first_name, business_name, postcode, service_radius_miles, phone FROM electricians WHERE id = $1',
    [electricianId]
  )
  const elec = elecRows[0]

  const services = await sql(
    'SELECT category, price_from, price_to, day_rate, pricing_note FROM services WHERE electrician_id = $1',
    [electricianId]
  )

  const verifications = await sql(
    `SELECT type, scheme, status, reference_number FROM verifications WHERE electrician_id = $1 AND status = 'verified'`,
    [electricianId]
  )

  const voice = await sql(
    'SELECT tone_notes FROM voice_recordings WHERE electrician_id = $1 AND processed = true ORDER BY created_at DESC LIMIT 1',
    [electricianId]
  )

  const rules = await sql(
    'SELECT rule_text FROM agent_rules WHERE electrician_id = $1 AND active = true ORDER BY created_at',
    [electricianId]
  )

  let area = elec.postcode as string
  try {
    const pcRes = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(area)}`)
    const pcData = await pcRes.json() as { result?: { admin_district?: string; region?: string } }
    if (pcData.result) {
      area = pcData.result.admin_district || pcData.result.region || area
    }
  } catch { /* fallback to postcode */ }

  return {
    first_name: elec.first_name as string,
    business_name: elec.business_name as string | null,
    area,
    service_radius_miles: elec.service_radius_miles as number,
    phone: elec.phone as string,
    services: services.map((s) => ({
      category: s.category as string,
      price_from: s.price_from as number | null,
      price_to: s.price_to as number | null,
      day_rate: s.day_rate as number | null,
      pricing_note: s.pricing_note as string | null,
    })),
    verifications: verifications.map((v) => ({
      type: v.type as string,
      scheme: v.scheme as string | null,
      status: v.status as string,
      reference_number: v.reference_number as string | null,
    })),
    tone_notes: (voice[0]?.tone_notes as string | null) || null,
    rules: rules.map((r) => r.rule_text as string),
  }
}

async function updateConversationData(
  sql: ReturnType<typeof neon>,
  conversationId: string,
  extracted: Record<string, string | null>
): Promise<void> {
  const fields: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (extracted.customer_name) { fields.push(`customer_name = $${paramIndex++}`); values.push(extracted.customer_name) }
  if (extracted.job_type) { fields.push(`job_type = $${paramIndex++}`); values.push(extracted.job_type) }
  if (extracted.postcode) { fields.push(`job_location_postcode = $${paramIndex++}`); values.push(extracted.postcode) }
  if (extracted.property_type) { fields.push(`property_type = $${paramIndex++}`); values.push(extracted.property_type) }
  if (extracted.urgency) { fields.push(`urgency = $${paramIndex++}`); values.push(extracted.urgency) }

  if (fields.length === 0) return

  values.push(conversationId)
  await sql(`UPDATE conversations SET ${fields.join(', ')} WHERE id = $${paramIndex}`, values)
}

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('Claude API error:', response.status, errorBody)
    throw new Error(`Claude API returned ${response.status}`)
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>
  }

  const textBlock = data.content.find((c) => c.type === 'text')
  if (!textBlock?.text) throw new Error('No text in Claude response')

  return textBlock.text
}
