import { verifyToken } from '@clerk/backend'
import { neon } from '@neondatabase/serverless'

// ===========================================
// Types
// ===========================================

export interface Env {
  NEON_DATABASE_URL: string
  CLERK_SECRET_KEY: string
  CLERK_PUBLISHABLE_KEY: string
  ENCRYPTION_KEY: string
  ENVIRONMENT: string
  BUCKET: R2Bucket
}

interface AuthContext {
  userId: string
}

type HandlerFn = (
  request: Request,
  env: Env,
  auth: AuthContext,
  params: Record<string, string>
) => Promise<Response>

type PublicHandlerFn = (
  request: Request,
  env: Env,
  params: Record<string, string>
) => Promise<Response>

interface Route {
  method: string
  pattern: RegExp
  handler: HandlerFn | PublicHandlerFn
  public?: boolean
}

// ===========================================
// CORS
// ===========================================

const ALLOWED_ORIGINS = [
  'https://tradgo.co.uk',
  'https://www.tradgo.co.uk',
  'https://tradgo-production.up.railway.app',
]

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ''

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  }
}

function securityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }
}

// ===========================================
// Auth middleware
// ===========================================

async function authenticate(
  request: Request,
  env: Env
): Promise<AuthContext | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    })
    if (!payload.sub) return null
    return { userId: payload.sub }
  } catch {
    return null
  }
}

// ===========================================
// Response helpers
// ===========================================

function json(data: unknown, status: number, request: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request),
      ...securityHeaders(),
    },
  })
}

function errorResponse(
  message: string,
  status: number,
  request: Request
): Response {
  return json({ error: message }, status, request)
}

// ===========================================
// Routes
// ===========================================

const routes: Route[] = [
  {
    method: 'GET',
    pattern: /^\/health$/,
    public: true,
    handler: async (request: Request) => {
      return json({ status: 'ok', service: 'tradgo-api-core' }, 200, request)
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/me$/,
    handler: async (request, env, auth) => {
      const sql = neon(env.NEON_DATABASE_URL)
      const rows = await sql(
        'SELECT id, first_name, business_name, email, agent_status, onboarding_step FROM electricians WHERE clerk_id = $1',
        [auth.userId]
      )
      if (rows.length === 0) {
        return json({ exists: false }, 200, request)
      }
      return json({ exists: true, electrician: rows[0] }, 200, request)
    },
  },
]

// ===========================================
// Router
// ===========================================

function matchRoute(
  method: string,
  pathname: string
): { route: Route; params: Record<string, string> } | null {
  for (const route of routes) {
    if (route.method !== method) continue
    const match = pathname.match(route.pattern)
    if (match) {
      const params: Record<string, string> = {}
      if (match.groups) {
        Object.assign(params, match.groups)
      }
      return { route, params }
    }
  }
  return null
}

// ===========================================
// Worker entry
// ===========================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      })
    }

    const url = new URL(request.url)
    const matched = matchRoute(request.method, url.pathname)

    if (!matched) {
      return errorResponse('Not found', 404, request)
    }

    const { route, params } = matched

    try {
      // Public routes skip auth
      if (route.public) {
        return await (route.handler as PublicHandlerFn)(request, env, params)
      }

      // Authenticated routes
      const auth = await authenticate(request, env)
      if (!auth) {
        return errorResponse('Unauthorized', 401, request)
      }

      return await (route.handler as HandlerFn)(request, env, auth, params)
    } catch (err) {
      const message =
        env.ENVIRONMENT === 'production'
          ? 'Internal server error'
          : err instanceof Error
            ? err.message
            : 'Unknown error'

      console.error('Unhandled error:', err)
      return errorResponse(message, 500, request)
    }
  },
}
