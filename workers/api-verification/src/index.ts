import { neon } from '@neondatabase/serverless'
import { handleRegistrationVerification } from './handlers/registration'
import { handleInsuranceVerification } from './handlers/insurance'
import { sendAlert } from './handlers/alerting'

export interface Env {
  NEON_DATABASE_URL: string
  SENTRY_DSN: string
  ENVIRONMENT: string
  INTERNAL_SECRET: string
}

interface VerificationRequest {
  verification_id: string
  electrician_id: string
  type: 'registration' | 'insurance'
  scheme?: string
  reference_number?: string
  document_r2_key?: string
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  })
}

function authenticateInternal(request: Request, env: Env): boolean {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  return authHeader.replace('Bearer ', '') === env.INTERNAL_SECRET
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    const url = new URL(request.url)

    if (url.pathname === '/health' && request.method === 'GET') {
      return json({ status: 'ok', service: 'tradgo-api-verification' }, 200)
    }

    if (!authenticateInternal(request, env)) {
      return json({ error: 'Unauthorized' }, 401)
    }

    try {
      if (url.pathname === '/verify' && request.method === 'POST') {
        const body = (await request.json()) as VerificationRequest
        const sql = neon(env.NEON_DATABASE_URL)

        if (body.type === 'registration') {
          await handleRegistrationVerification(sql, body.verification_id, body.scheme, body.reference_number)
        } else if (body.type === 'insurance') {
          await handleInsuranceVerification(sql, body.verification_id, body.document_r2_key)
        } else {
          return json({ error: 'Unknown verification type' }, 400)
        }

        return json({ success: true }, 200)
      }

      return json({ error: 'Not found' }, 404)
    } catch (err) {
      console.error('Verification worker error:', err)

      await sendAlert(env, {
        level: 'error',
        message: err instanceof Error ? err.message : 'Unknown verification error',
        context: { url: url.pathname },
      })

      return json({ error: 'Verification processing failed' }, 500)
    }
  },
}
