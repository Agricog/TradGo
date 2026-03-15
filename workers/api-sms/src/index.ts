import { handleInboundSms } from './handlers/inbound'

export interface Env {
  NEON_DATABASE_URL: string
  TWILIO_ACCOUNT_SID: string
  TWILIO_AUTH_TOKEN: string
  ANTHROPIC_API_KEY: string
  ENVIRONMENT: string
}

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

    // Twilio inbound SMS webhook
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

        const from = params.get('From') || ''
        const to = params.get('To') || ''
        const messageBody = params.get('Body') || ''

        if (!from || !messageBody) {
          return new Response(
            '<Response><Message>Sorry, something went wrong.</Message></Response>',
            { status: 200, headers: { 'Content-Type': 'text/xml' } }
          )
        }

        const twiml = await handleInboundSms(env, from, to, messageBody)

        return new Response(twiml, {
          status: 200,
          headers: { 'Content-Type': 'text/xml' },
        })
      } catch (err) {
        console.error('Inbound SMS error:', err)
        return new Response(
          '<Response><Message>Sorry, something went wrong. Please try again.</Message></Response>',
          { status: 200, headers: { 'Content-Type': 'text/xml' } }
        )
      }
    }

    return json({ error: 'Not found' }, 404)
  },
}
