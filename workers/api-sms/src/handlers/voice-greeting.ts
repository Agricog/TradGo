import { neon } from '@neondatabase/serverless'
import type { Env } from '../index'
import { sendReply } from './send-reply'

/**
 * Handle an inbound voice call (missed call diverted to Twilio number).
 * 
 * Flow:
 * 1. Customer calls Dave's personal number
 * 2. Dave can't answer — call forwards to his Twilio number
 * 3. Twilio hits this webhook
 * 4. We play a short voice message and hang up
 * 5. We immediately send an SMS to the caller from the AI agent
 * 6. Caller replies by text — handled by existing inbound.ts flow
 */
export async function handleVoiceGreeting(
  env: Env,
  from: string,
  to: string
): Promise<string> {
  const sql = neon(env.NEON_DATABASE_URL)

  // 1. Identify electrician by Twilio number
  const elecRows = await sql(
    `SELECT id, first_name, business_name, phone, agent_status, twilio_number
     FROM electricians WHERE twilio_number = $1`,
    [to]
  )

  if (elecRows.length === 0) {
    console.error(`Voice: No electrician found for Twilio number: ${to}`)
    return voiceTwiml(
      'Sorry, this number is not currently active. Please try again later.',
      false
    )
  }

  const electrician = elecRows[0]
  const electricianId = electrician.id as string
  const firstName = electrician.first_name as string
  const businessName = electrician.business_name as string | null
  const agentStatus = electrician.agent_status as string
  const twilioNumber = electrician.twilio_number as string

  // 2. If agent is paused, give them Dave's direct number
  if (agentStatus === 'paused') {
    const phone = electrician.phone as string
    return voiceTwiml(
      `Hi, thanks for calling ${businessName || firstName}. ` +
      `We're not taking messages right now. ` +
      `You can reach ${firstName} directly on ${phone}.`,
      false
    )
  }

  // 3. Play the voice greeting and hang up
  const displayName = businessName || `${firstName}'s Electrical`
  const voiceMessage =
    `Hi, thanks for calling ${displayName}. ` +
    `${firstName} is on a job right now and can't get to the phone. ` +
    `I'm sending you a text message now so we can get your job sorted straight away.`

  // 4. Fire the SMS in the background
  // We don't await this — the voice response returns immediately
  // The SMS creates a new conversation via the normal inbound flow when the customer replies
  const smsBody =
    `Hi, it's ${displayName}. Sorry ${firstName} couldn't get to the phone — ` +
    `he's on a job right now. Tell me what you need and I'll get you a price straight away.`

  // Send SMS before returning voice response
  // Must await — Cloudflare Workers terminate after response is sent
  try {
    await sendInitialSms(env, sql, electricianId, twilioNumber, from, smsBody)
  } catch (err) {
    console.error('Failed to send missed-call SMS:', err)
  }

  return voiceTwiml(voiceMessage, true)
}

/**
 * Send the initial SMS after a missed call and create the conversation.
 */
async function sendInitialSms(
  env: Env,
  sql: ReturnType<typeof neon>,
  electricianId: string,
  twilioNumber: string,
  customerPhone: string,
  body: string
): Promise<void> {
  // Check if there's already an active conversation with this customer
  const existing = await sql(
    `SELECT id FROM conversations
     WHERE electrician_id = $1 AND customer_phone = $2
     AND status IN ('active', 'awaiting_approval')
     ORDER BY created_at DESC LIMIT 1`,
    [electricianId, customerPhone]
  )

  let conversationId: string

  if (existing.length > 0) {
    conversationId = existing[0].id as string
  } else {
    // Create new conversation tagged as missed_call origin
    const newConv = await sql(
      `INSERT INTO conversations (electrician_id, channel, customer_phone, status, source_url)
       VALUES ($1, 'sms', $2, 'active', 'missed_call')
       RETURNING id`,
      [electricianId, customerPhone]
    )
    conversationId = newConv[0].id as string
  }

  // Store the agent's opening message
  await sql(
    `INSERT INTO messages (conversation_id, role, content, classification, sent, sent_at)
     VALUES ($1, 'agent', $2, 'safe', true, now())`,
    [conversationId, body]
  )

  // Send via Twilio
  const result = await sendReply(
    env.TWILIO_ACCOUNT_SID,
    env.TWILIO_AUTH_TOKEN,
    twilioNumber,
    customerPhone,
    body,
    'sms'
  )

  if (!result.success) {
    console.error('Missed-call SMS send failed:', result.error)
  }
}

/**
 * Generate TwiML for a voice response.
 * Uses Twilio's <Say> verb with a British English voice.
 */
function voiceTwiml(message: string, hangupAfter: boolean): string {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Response>',
    `  <Say voice="Google.en-GB-Standard-A" language="en-GB">${escaped}</Say>`,
    hangupAfter ? '  <Hangup/>' : '',
    '</Response>',
  ].join('\n')
}
