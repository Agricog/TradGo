import { neon } from '@neondatabase/serverless'
import { authenticate, type AuthContext } from './middleware/auth'
import { handlePreflight } from './middleware/cors'
import { json, errorResponse, handleError } from './utils/errors'
import {
  handleOnboardingDetails,
  handleOnboardingServices,
  handleGetServices,
  handleOnboardingPricing,
  handleVoiceUpload,
  handleVoiceConfirm,
  handleVoiceBlobUpload,
} from './routes/onboarding'

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
// Routes
// ===========================================

const routes: Route[] = [
  // Health check
  {
    method: 'GET',
    pattern: /^\/health$/,
    public: true,
    handler: async (request: Request) => {
      return json({ status: 'ok', service: 'tradgo-api-core' }, 200, request)
    },
  },

  // Auth: get current electrician
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

  // Onboarding: save details (step 2)
  {
    method: 'POST',
    pattern: /^\/api\/onboarding\/details$/,
    handler: async (request, env, auth) => handleOnboardingDetails(request, env, auth),
  },

  // Onboarding: save services (step 3)
  {
    method: 'POST',
    pattern: /^\/api\/onboarding\/services$/,
    handler: async (request, env, auth) => handleOnboardingServices(request, env, auth),
  },

  // Onboarding: get services (for pricing step)
  {
    method: 'GET',
    pattern: /^\/api\/onboarding\/services$/,
    handler: async (request, env, auth) => handleGetServices(request, env, auth),
  },

  // Onboarding: save pricing (step 4)
  {
    method: 'POST',
    pattern: /^\/api\/onboarding\/pricing$/,
    handler: async (request, env, auth) => handleOnboardingPricing(request, env, auth),
  },

  // Onboarding: get voice upload URL (step 5)
  {
    method: 'POST',
    pattern: /^\/api\/onboarding\/voice-upload$/,
    handler: async (request, env, auth) => handleVoiceUpload(request, env, auth),
  },

  // Onboarding: upload voice blob directly
  {
    method: 'PUT',
    pattern: /^\/api\/onboarding\/voice-blob$/,
    handler: async (request, env, auth) => handleVoiceBlobUpload(request, env, auth),
  },

  // Onboarding: confirm voice recording (step 5)
  {
    method: 'POST',
    pattern: /^\/api\/onboarding\/voice-confirm$/,
    handler: async (request, env, auth) => handleVoiceConfirm(request, env, auth),
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
    if (request.method === 'OPTIONS') {
      return handlePreflight(request)
    }

    const url = new URL(request.url)
    const matched = matchRoute(request.method, url.pathname)

    if (!matched) {
      return errorResponse('Not found', 404, request)
    }

    const { route, params } = matched

    try {
      if (route.public) {
        return await (route.handler as PublicHandlerFn)(request, env, params)
      }

      const auth = await authenticate(request, env)
      if (!auth) {
        return errorResponse('Unauthorized', 401, request)
      }

      return await (route.handler as HandlerFn)(request, env, auth, params)
    } catch (err) {
      return handleError(err, request, env.ENVIRONMENT === 'production')
    }
  },
}
