import { neon } from '@neondatabase/serverless'
import { z } from 'zod'
import type { Env } from '../index'

// ===========================================
// Schemas
// ===========================================

const startConversationSchema = z.object({
  customer_name: z.string().min(2).max(100),
  customer_contact: z.string().min(5).max(200),
  contact_type: z.enum(['phone', 'email']),
  message: z.string().min(10).max(2000),
})

const sendMessageSchema = z.object({
  message: z.string().min(1).max(2000),
})

// ===========================================
// Helpers
// ===========================================

function json(data: unknown, status: number, request?: Request): Response {
  const origin = request?.headers.get('Origin') || '*'
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
    },
  })
}

function generateSessionToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 48; i++) {
    token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

async function buildSystemPrompt(
  sql: ReturnType<typeof neon>,
  electricianId: string
): Promise<string> {
  const [elecRows, serviceRows, verificationRows, voiceRows, ruleRows] = await Promise.all([
    sql('SELECT first_name, business_name, postcode, service_radius_miles FROM electricians WHERE id = $1', [electricianId]),
    sql('SELECT category, price_from, price_to, day_rate, pricing_note FROM services WHERE electrician_id = $1', [electricianId]),
    sql("SELECT type, scheme FROM verifications WHERE electrician_id = $1 AND status = 'verified'", [electricianId]),
    sql('SELECT tone_notes FROM voice_recordings WHERE electrician_id = $1 AND processed = true ORDER BY created_at DESC LIMIT 1', [electricianId]),
    sql("SELECT rule_text FROM agent_rules WHERE electrician_id = $1 AND active = true ORDER BY created_at", [electricianId]),
  ])

  const elec = elecRows[0]
  if (!elec) return 'You are a helpful assistant.'

  const firstName = elec.first_name as string
  const businessName = elec.business_name as string || `${firstName}'s Electrical`
  const area = elec.postcode as string
  const radius = elec.service_radius_miles as number

  const servicesList = serviceRows.map((s: Record<string, unknown>) => {
    const parts = [s.category as string]
    if (s.price_from && s.price_to) parts.push(`£${s.price_from}–£${s.price_to}`)
    else if (s.day_rate) parts.push(`£${s.day_rate}/day`)
    if (s.pricing_note) parts.push(`(${s.pricing_note})`)
    return `- ${parts.join(': ')}`
  }).join('\n')

  const verificationStatements = verificationRows.map((v: Record<string, unknown>) => {
    if (v.type === 'registration') return `${firstName} is ${v.scheme} registered. All work comes with their backed warranty.`
    if (v.type === 'insurance') return `${firstName} holds valid public liability insurance.`
    return ''
  }).filter(Boolean).join('\n')

  const toneNotes = voiceRows[0]?.tone_notes as string || 'Friendly, professional, to the point.'
  const rules = ruleRows.map((r: Record<string, unknown>) => `- ${r.rule_text}`).join('\n')

  return `You are the AI agent for ${firstName} (${businessName}), a qualified electrician based in ${area}.

## Your role
You answer customer enquiries on ${firstName}'s behalf. You are helpful, professional, and sound like ${firstName} — not like a generic AI assistant.

## How you sound
${toneNotes}

Use natural, conversational language. Keep messages short — 2-4 sentences max per reply. Ask one question at a time.

## What ${firstName} does
Services offered:
${servicesList || '(Services not yet configured)'}

Service area: ${area}, within approximately ${radius} miles.

## Pricing rules
- All prices are ESTIMATE RANGES, never fixed quotes.
- Always include "subject to a site visit" or similar.
- Never negotiate price. If the customer pushes back, say you'll check with ${firstName}.
- Never invent prices. Only use prices from the data above.

## Availability rules
- ${firstName} is generally available within the next 5-7 working days.
- Never commit to a specific date or time.
- Say things like "${firstName}'s usually available within the next week or so — I'll check and get back to you with a specific time."

## Verification and trust
${verificationStatements || 'No verification badges yet.'}

Mention verification naturally when relevant — don't force it into every message.

## What you NEVER do
- Never give a firm, binding quote.
- Never commit to a specific date or time.
- Never handle complaints — say you'll get ${firstName} to come back to them directly.
- Never handle emergencies — direct customer to call ${firstName} directly or 999.
- Never make up information.
- Never say "I'm an AI" unprompted. If asked, say "I'm ${firstName}'s agent — I handle enquiries and bookings."
- Never apologise excessively.

## Your goal
Move the customer toward a booked visit:
1. Understand what they need.
2. Confirm it's within ${firstName}'s services and area.
3. Provide an estimate range if pricing is available.
4. Propose general availability.
5. Get the customer's address/location.

${rules ? `## Additional rules\n${rules}` : ''}

After generating your response, output in this exact format:
<response>Your message to the customer</response>
<classification>SAFE|APPROVAL|ESCALATE</classification>
<inbox_summary>One-line summary for the electrician's inbox</inbox_summary>
<extracted>{"customer_name":"","job_type":"","postcode":"","property_type":"","urgency":""}</extracted>

Only include fields in <extracted> that have NEW information from the latest message. Omit fields with no new data.`
}

async function callClaude(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  apiKey: string
): Promise<{ response: string; classification: string; inboxSummary: string; extracted: Record<string, string> }> {
  const claudeMessages = messages.map((m) => ({
    role: m.role === 'customer' ? 'user' as const : 'assistant' as const,
    content: m.content,
  }))

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: systemPrompt,
      messages: claudeMessages,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('Claude API error:', err)
    throw new Error('Agent is temporarily unavailable')
  }

  const data = await res.json() as { content: { type: string; text: string }[] }
  const fullText = data.content.map((c) => c.text).join('')

  // Parse structured output
  const responseMatch = fullText.match(/<response>([\s\S]*?)<\/response>/)
  const classMatch = fullText.match(/<classification>(SAFE|APPROVAL|ESCALATE)<\/classification>/)
  const summaryMatch = fullText.match(/<inbox_summary>([\s\S]*?)<\/inbox_summary>/)
  const extractedMatch = fullText.match(/<extracted>([\s\S]*?)<\/extracted>/)

  const response = responseMatch?.[1]?.trim() || fullText.replace(/<[^>]+>/g, '').trim()
  const classification = classMatch?.[1] || 'APPROVAL'
  const inboxSummary = summaryMatch?.[1]?.trim() || ''

  let extracted: Record<string, string> = {}
  if (extractedMatch?.[1]) {
    try { extracted = JSON.parse(extractedMatch[1]) } catch { /* ignore */ }
  }

  return { response, classification, inboxSummary, extracted }
}

// ===========================================
// Handlers
// ===========================================

/**
 * POST /api/agent-public/:slug/conversation
 * Start a new conversation. Creates conversation + messages, calls Claude.
 */
export async function handleStartConversation(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  // Validate body
  let body: z.infer<typeof startConversationSchema>
  try {
    const raw = await request.json()
    body = startConversationSchema.parse(raw)
  } catch {
    return json({ error: 'Invalid request. Please fill in all fields.' }, 400, request)
  }

  const sql = neon(env.NEON_DATABASE_URL)

  // Find electrician from slug
  const pageRows = await sql(
    `SELECT ap.electrician_id, e.agent_status, e.agent_status
     FROM agent_pages ap
     JOIN electricians e ON ap.electrician_id = e.id
     WHERE ap.slug = $1 AND ap.is_active = true`,
    [slug]
  )

  if (pageRows.length === 0) {
    return json({ error: 'Agent not found' }, 404, request)
  }

  const electricianId = pageRows[0].electrician_id as string
  const agentStatus = pageRows[0].agent_status as string

  if (agentStatus !== 'live') {
    return json({ error: 'Agent is currently offline' }, 503, request)
  }

  // Rate limit: 5 new conversations per IP per hour
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown'
  const recentConvos = await sql(
    `SELECT COUNT(*) as count FROM conversations
     WHERE electrician_id = $1 AND channel = 'web' AND created_at > NOW() - INTERVAL '1 hour'
     AND source_url LIKE $2`,
    [electricianId, `%${ip}%`]
  )
  if (Number(recentConvos[0]?.count) >= 5) {
    return json({ error: 'Too many conversations. Please try again later.' }, 429, request)
  }

  // Create session token
  const sessionToken = generateSessionToken()

  // Create conversation
  const convRows = await sql(
    `INSERT INTO conversations (electrician_id, channel, customer_name, customer_phone, customer_email, status, source_url)
     VALUES ($1, 'web', $2, $3, $4, 'active', $5)
     RETURNING id`,
    [
      electricianId,
      body.customer_name,
      body.contact_type === 'phone' ? body.customer_contact : null,
      body.contact_type === 'email' ? body.customer_contact : null,
      `session:${sessionToken}|ip:${ip}`,
    ]
  )

  const conversationId = convRows[0].id as string

  // Store customer message
  await sql(
    `INSERT INTO messages (conversation_id, role, content, classification, sent, sent_at)
     VALUES ($1, 'customer', $2, 'safe', true, NOW())`,
    [conversationId, body.message]
  )

  // Build prompt and call Claude
  const systemPrompt = await buildSystemPrompt(sql, electricianId)
  const messages = [{ role: 'customer', content: body.message }]

  let agentResponse: string
  let classification: string
  let inboxSummary: string
  let extracted: Record<string, string> = {}

  try {
    const result = await callClaude(systemPrompt, messages, env.ANTHROPIC_API_KEY)
    agentResponse = result.response
    classification = result.classification
    inboxSummary = result.inboxSummary
    extracted = result.extracted
  } catch {
    agentResponse = `Thanks for getting in touch! I'll pass your message to ${(await sql('SELECT first_name FROM electricians WHERE id = $1', [electricianId]))[0]?.first_name || 'the electrician'} and they'll get back to you shortly.`
    classification = 'APPROVAL'
    inboxSummary = 'New web enquiry — agent fallback response'
  }

  // Update conversation with extracted data
  const updates: string[] = []
  const values: unknown[] = [conversationId]
  let paramIdx = 2
  if (extracted.job_type) { updates.push(`job_type = $${paramIdx++}`); values.push(extracted.job_type) }
  if (extracted.postcode) { updates.push(`job_location_postcode = $${paramIdx++}`); values.push(extracted.postcode) }
  if (extracted.property_type) { updates.push(`property_type = $${paramIdx++}`); values.push(extracted.property_type) }
  if (extracted.urgency) { updates.push(`urgency = $${paramIdx++}`); values.push(extracted.urgency) }
  if (updates.length > 0) {
    await sql(`UPDATE conversations SET ${updates.join(', ')} WHERE id = $1`, values)
  }

  // Determine if we send immediately or hold for approval
  const isSafe = classification === 'SAFE'
  const needsApproval = classification === 'APPROVAL' || classification === 'ESCALATE'

  // Store agent message
  await sql(
    `INSERT INTO messages (conversation_id, role, content, classification, inbox_summary, sent, sent_at, approved)
     VALUES ($1, 'agent', $2, $3, $4, $5, $6, $7)`,
    [
      conversationId,
      agentResponse,
      needsApproval ? 'needs_approval' : 'safe',
      inboxSummary,
      isSafe,
      isSafe ? new Date().toISOString() : null,
      isSafe ? true : null,
    ]
  )

  // Update conversation status if needs approval
  if (needsApproval) {
    await sql(`UPDATE conversations SET status = 'awaiting_approval' WHERE id = $1`, [conversationId])
  }

  return json({
    session_token: sessionToken,
    conversation_id: conversationId,
    agent_response: isSafe ? agentResponse : null,
    awaiting_approval: needsApproval,
    opening_message: isSafe ? undefined : `Thanks for getting in touch! I'm looking into this and will get back to you shortly.`,
  }, 200, request)
}

/**
 * POST /api/agent-public/:slug/message
 * Send a follow-up message in an existing conversation.
 * Requires X-Session-Token header.
 */
export async function handleSendMessage(
  request: Request,
  env: Env,
  slug: string,
): Promise<Response> {
  // Get session token
  const sessionToken = request.headers.get('X-Session-Token')
  if (!sessionToken) {
    return json({ error: 'Session expired. Please refresh the page.' }, 401, request)
  }

  // Validate body
  let body: z.infer<typeof sendMessageSchema>
  try {
    const raw = await request.json()
    body = sendMessageSchema.parse(raw)
  } catch {
    return json({ error: 'Invalid message' }, 400, request)
  }

  const sql = neon(env.NEON_DATABASE_URL)

  // Find conversation by session token
  const convRows = await sql(
    `SELECT c.id, c.electrician_id, e.agent_status
     FROM conversations c
     JOIN electricians e ON c.electrician_id = e.id
     JOIN agent_pages ap ON ap.electrician_id = e.id
     WHERE c.source_url LIKE $1 AND ap.slug = $2 AND c.channel = 'web'
     ORDER BY c.created_at DESC LIMIT 1`,
    [`%session:${sessionToken}%`, slug]
  )

  if (convRows.length === 0) {
    return json({ error: 'Conversation not found. Please refresh and try again.' }, 404, request)
  }

  const conversationId = convRows[0].id as string
  const electricianId = convRows[0].electrician_id as string

  // Rate limit: 20 messages per conversation per hour
  const recentMsgs = await sql(
    `SELECT COUNT(*) as count FROM messages
     WHERE conversation_id = $1 AND role = 'customer' AND created_at > NOW() - INTERVAL '1 hour'`,
    [conversationId]
  )
  if (Number(recentMsgs[0]?.count) >= 20) {
    return json({ error: 'Please slow down. Try again in a few minutes.' }, 429, request)
  }

  // Store customer message
  await sql(
    `INSERT INTO messages (conversation_id, role, content, classification, sent, sent_at)
     VALUES ($1, 'customer', $2, 'safe', true, NOW())`,
    [conversationId, body.message]
  )

  // Load conversation history (last 10 messages)
  const historyRows = await sql(
    `SELECT role, COALESCE(approved_content, content) as content
     FROM messages WHERE conversation_id = $1 AND sent = true
     ORDER BY created_at DESC LIMIT 10`,
    [conversationId]
  )
  const history = historyRows.reverse().map((m: Record<string, unknown>) => ({
    role: m.role as string,
    content: m.content as string,
  }))

  // Add current message
  history.push({ role: 'customer', content: body.message })

  // Build prompt and call Claude
  const systemPrompt = await buildSystemPrompt(sql, electricianId)

  let agentResponse: string
  let classification: string
  let inboxSummary: string
  let extracted: Record<string, string> = {}

  try {
    const result = await callClaude(systemPrompt, history, env.ANTHROPIC_API_KEY)
    agentResponse = result.response
    classification = result.classification
    inboxSummary = result.inboxSummary
    extracted = result.extracted
  } catch {
    const firstName = (await sql('SELECT first_name FROM electricians WHERE id = $1', [electricianId]))[0]?.first_name || 'the electrician'
    agentResponse = `Let me check with ${firstName} on that and get back to you.`
    classification = 'APPROVAL'
    inboxSummary = 'Agent fallback — Claude unavailable'
  }

  // Update conversation with extracted data
  const updates: string[] = []
  const values: unknown[] = [conversationId]
  let paramIdx = 2
  if (extracted.job_type) { updates.push(`job_type = $${paramIdx++}`); values.push(extracted.job_type) }
  if (extracted.postcode) { updates.push(`job_location_postcode = $${paramIdx++}`); values.push(extracted.postcode) }
  if (extracted.property_type) { updates.push(`property_type = $${paramIdx++}`); values.push(extracted.property_type) }
  if (extracted.urgency) { updates.push(`urgency = $${paramIdx++}`); values.push(extracted.urgency) }
  if (updates.length > 0) {
    await sql(`UPDATE conversations SET ${updates.join(', ')} WHERE id = $1`, values)
  }

  const isSafe = classification === 'SAFE'
  const needsApproval = !isSafe

  // Store agent message
  await sql(
    `INSERT INTO messages (conversation_id, role, content, classification, inbox_summary, sent, sent_at, approved)
     VALUES ($1, 'agent', $2, $3, $4, $5, $6, $7)`,
    [
      conversationId,
      agentResponse,
      needsApproval ? 'needs_approval' : 'safe',
      inboxSummary,
      isSafe,
      isSafe ? new Date().toISOString() : null,
      isSafe ? true : null,
    ]
  )

  if (needsApproval) {
    await sql(`UPDATE conversations SET status = 'awaiting_approval' WHERE id = $1`, [conversationId])
  }

  return json({
    agent_response: isSafe ? agentResponse : null,
    awaiting_approval: needsApproval,
    placeholder: needsApproval ? `I'm just checking on that — you'll hear back shortly.` : undefined,
  }, 200, request)
}
