
import { neon } from '@neondatabase/serverless'
import { authenticate, type AuthContext } from './middleware/auth'
import { handlePreflight } from './middleware/cors'
import { json, errorResponse, handleError } from './utils/errors'
import { handleGetVapidKey, handlePushSubscribe, handleGetNotificationPreferences, handleUpdateNotificationPreferences } from './routes/notifications'
import {
  handleOnboardingDetails, handleOnboardingServices, handleGetServices,
  handleOnboardingPricing, handleVoiceBlobUpload, handleVoiceConfirm,
  handleVerification, handleInsuranceUpload, handleVerifyComplete,
  handleGoLiveData, handleActivate,
} from './routes/onboarding'
import {
  handleListConversations, handleGetConversation,
  handleApprove, handleEdit, handleReject, handleReply, handleComplete,
} from './routes/conversations'
import {
  handleGetAgentStatus, handleUpdateAgentStatus,
  handleGetRules, handleCreateRule, handleUpdateRule, handleDeleteRule,
  handleGetSuggestions, handleSuggestionAction,
} from './routes/agent'
import { handleStatsSummary } from './routes/stats'

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
  VERIFICATION_WORKER_URL: string
  INTERNAL_SECRET: string
  TWILIO_ACCOUNT_SID: string
  TWILIO_AUTH_TOKEN: string
}

type HandlerFn = (
  request: Request, env: Env, auth: AuthContext, params: Record<string, string>
) => Promise<Response>

type PublicHandlerFn = (
  request: Request, env: Env, params: Record<string, string>
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
  // Health
  { method: 'GET', pattern: /^\/health$/, public: true,
    handler: async (request: Request) => json({ status: 'ok', service: 'tradgo-api-core' }, 200, request) },

  // Auth
  { method: 'GET', pattern: /^\/api\/me$/,
    handler: async (request, env, auth) => {
      const sql = neon(env.NEON_DATABASE_URL)
      const rows = await sql(
        'SELECT id, first_name, business_name, email, agent_status, onboarding_step FROM electricians WHERE clerk_id = $1',
        [auth.userId]
      )
      if (rows.length === 0) return json({ exists: false }, 200, request)
      return json({ exists: true, electrician: rows[0] }, 200, request)
    },
  },

  // Onboarding
  { method: 'POST', pattern: /^\/api\/onboarding\/details$/, handler: async (r, e, a) => handleOnboardingDetails(r, e, a) },
  { method: 'POST', pattern: /^\/api\/onboarding\/services$/, handler: async (r, e, a) => handleOnboardingServices(r, e, a) },
  { method: 'GET', pattern: /^\/api\/onboarding\/services$/, handler: async (r, e, a) => handleGetServices(r, e, a) },
  { method: 'POST', pattern: /^\/api\/onboarding\/pricing$/, handler: async (r, e, a) => handleOnboardingPricing(r, e, a) },
  { method: 'PUT', pattern: /^\/api\/onboarding\/voice-blob$/, handler: async (r, e, a) => handleVoiceBlobUpload(r, e, a) },
  { method: 'POST', pattern: /^\/api\/onboarding\/voice-confirm$/, handler: async (r, e, a) => handleVoiceConfirm(r, e, a) },
  { method: 'POST', pattern: /^\/api\/onboarding\/verification$/, handler: async (r, e, a) => handleVerification(r, e, a) },
  { method: 'PUT', pattern: /^\/api\/onboarding\/insurance-upload$/, handler: async (r, e, a) => handleInsuranceUpload(r, e, a) },
  { method: 'POST', pattern: /^\/api\/onboarding\/verify-complete$/, handler: async (r, e, a) => handleVerifyComplete(r, e, a) },
  { method: 'GET', pattern: /^\/api\/onboarding\/go-live$/, handler: async (r, e, a) => handleGoLiveData(r, e, a) },
  { method: 'POST', pattern: /^\/api\/onboarding\/activate$/, handler: async (r, e, a) => handleActivate(r, e, a) },

  // Conversations
  { method: 'GET', pattern: /^\/api\/conversations$/, handler: async (r, e, a) => handleListConversations(r, e, a) },
  { method: 'GET', pattern: /^\/api\/conversations\/(?<id>[a-f0-9-]+)$/, handler: async (r, e, a, p) => handleGetConversation(r, e, a, p) },
  { method: 'POST', pattern: /^\/api\/conversations\/(?<id>[a-f0-9-]+)\/approve$/, handler: async (r, e, a, p) => handleApprove(r, e, a, p) },
  { method: 'POST', pattern: /^\/api\/conversations\/(?<id>[a-f0-9-]+)\/edit$/, handler: async (r, e, a, p) => handleEdit(r, e, a, p) },
  { method: 'POST', pattern: /^\/api\/conversations\/(?<id>[a-f0-9-]+)\/reject$/, handler: async (r, e, a, p) => handleReject(r, e, a, p) },
  { method: 'POST', pattern: /^\/api\/conversations\/(?<id>[a-f0-9-]+)\/reply$/, handler: async (r, e, a, p) => handleReply(r, e, a, p) },
  { method: 'POST', pattern: /^\/api\/conversations\/(?<id>[a-f0-9-]+)\/complete$/, handler: async (r, e, a, p) => handleComplete(r, e, a, p) },

  // Agent
  { method: 'GET', pattern: /^\/api\/agent\/status$/, handler: async (r, e, a) => handleGetAgentStatus(r, e, a) },
  { method: 'PUT', pattern: /^\/api\/agent\/status$/, handler: async (r, e, a) => handleUpdateAgentStatus(r, e, a) },
  { method: 'GET', pattern: /^\/api\/agent\/rules$/, handler: async (r, e, a) => handleGetRules(r, e, a) },
  { method: 'POST', pattern: /^\/api\/agent\/rules$/, handler: async (r, e, a) => handleCreateRule(r, e, a) },
  { method: 'PUT', pattern: /^\/api\/agent\/rules\/(?<id>[a-f0-9-]+)$/, handler: async (r, e, a, p) => handleUpdateRule(r, e, a, p) },
  { method: 'DELETE', pattern: /^\/api\/agent\/rules\/(?<id>[a-f0-9-]+)$/, handler: async (r, e, a, p) => handleDeleteRule(r, e, a, p) },
  { method: 'GET', pattern: /^\/api\/agent\/suggestions$/, handler: async (r, e, a) => handleGetSuggestions(r, e, a) },
  { method: 'POST', pattern: /^\/api\/agent\/suggestions\/(?<id>[a-f0-9-]+)$/, handler: async (r, e, a, p) => handleSuggestionAction(r, e, a, p) },

  // Stats
  { method: 'GET', pattern: /^\/api\/stats\/summary$/, handler: async (r, e, a) => handleStatsSummary(r, e, a) },
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
      if (match.groups) Object.assign(params, match.groups)
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
    if (request.method === 'OPTIONS') return handlePreflight(request)

    const url = new URL(request.url)
    const matched = matchRoute(request.method, url.pathname)
    if (!matched) return errorResponse('Not found', 404, request)

    const { route, params } = matched

    try {
      if (route.public) {
        return await (route.handler as PublicHandlerFn)(request, env, params)
      }

      const auth = await authenticate(request, env)
      if (!auth) return errorResponse('Unauthorized', 401, request)

      return await (route.handler as HandlerFn)(request, env, auth, params)
    } catch (err) {
      return handleError(err, request, env.ENVIRONMENT === 'production')
    }
  },
}
