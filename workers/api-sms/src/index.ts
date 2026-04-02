import { handleInboundMessage } from './handlers/inbound'
import { handleVoiceGreeting } from './handlers/voice-greeting'

export interface Env {
  NEON_DATABASE_URL: string
  TWILIO_ACCOUNT_SID: string
  TWILIO_AUTH_TOKEN: string
  ANTHROPIC_API_KEY: string
  ENVIRONMENT: string
}

export type Channel = 'sms' | 'whatsapp'

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

/**
 * Detect whatsapp: prefix and strip it.
 * Twilio sends WhatsApp messages with "whatsapp:+44..." format.
 */
function parseChannelAndPhone(raw: string): { channel: Channel; phone: string } {
  if (raw.startsWith('whatsapp:')) {
    return { channel: 'whatsapp', phone: raw.replace('whatsapp:', '') }
  }
  return { channel: 'sms', phone: raw }
}

/**
 * Validate Twilio request signature.
 * Uses HMAC-SHA1 to verify the request came from Twilio.
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
async function validateTwilioSignature(
  request: Request,
  authToken: string
): Promise<boolean> {
  const signature = request.headers.get('X-Twilio-Signature')
  if (!signature) return false

  const url = request.url
  const body = await request.clone().text()
  const params = new URLSearchParams(body)

  // Sort parameters and build validation string
  const sortedKeys = [...params.keys()].sort()
  let dataString = url
  for (const key of sortedKeys) {
    dataString += key + params.get(key)
  }

  // HMAC-SHA1
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )

  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(dataString))
  const computed = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))

  return computed === signature
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    const url = new URL(request.url)

    // Health check
    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ status: 'ok', service: 'tradgo-api-sms' }, 200)
    }

    // Twilio inbound webhook (handles both SMS and WhatsApp)
    if (url.pathname === '/api/sms/inbound' && request.method === 'POST') {
      // Validate Twilio signature in production
      if (env.ENVIRONMENT === 'production') {
        const valid = await validateTwilioSignature(request, env.TWILIO_AUTH_TOKEN)
        if (!valid) {
          console.error('Invalid Twilio signature — rejecting request')
          return json({ error: 'Invalid signature' }, 403)
        }
      }

      try {
        const body = await request.text()
        const params = new URLSearchParams(body)

        const rawFrom = params.get('From') || ''
        const rawTo = params.get('To') || ''
        const messageBody = params.get('Body') || ''

        if (!rawFrom || !messageBody) {
          return new Response(
            '<Response><Message>Sorry, something went wrong.</Message></Response>',
            { status: 200, headers: { 'Content-Type': 'text/xml' } }
          )
        }

        // Detect channel from whatsapp: prefix
        const { channel, phone: from } = parseChannelAndPhone(rawFrom)
        const { phone: to } = parseChannelAndPhone(rawTo)

        console.log(`Inbound ${channel} message from ${from} to ${to}`)

        const twiml = await handleInboundMessage(env, from, to, messageBody, channel)

        return new Response(twiml, {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        })
      } catch (err) {
        console.error('Inbound message error:', err)
        return new Response(
          '<Response><Message>Sorry, something went wrong. Please try again.</Message></Response>',
          { status: 200, headers: { 'Content-Type': 'text/xml' } }
        )
      }
    }

    // Twilio voice webhook (missed call text-back)
    if (url.pathname === '/api/sms/voice' && request.method === 'POST') {
      // Validate Twilio signature in production
      if (env.ENVIRONMENT === 'production') {
        const valid = await validateTwilioSignature(request, env.TWILIO_AUTH_TOKEN)
        if (!valid) {
          console.error('Invalid Twilio signature — rejecting voice request')
          return json({ error: 'Invalid signature' }, 403)
        }
      }

      try {
        const body = await request.text()
        const params = new URLSearchParams(body)

        const from = params.get('From') || ''
        const to = params.get('To') || ''

        if (!from || !to) {
          return new Response(
            '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, something went wrong.</Say><Hangup/></Response>',
            { status: 200, headers: { 'Content-Type': 'text/xml' } }
          )
        }

        console.log(`Inbound voice call from ${from} to ${to}`)

        const twiml = await handleVoiceGreeting(env, from, to)

        return new Response(twiml, {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        })
      } catch (err) {
        console.error('Voice greeting error:', err)
        return new Response(
          '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, we can\'t take your call right now. Please try again later.</Say><Hangup/></Response>',
          { status: 200, headers: { 'Content-Type': 'text/xml' } }
        )
      }
    }

    return json({ error: 'Not found' }, 404)
  },
}
