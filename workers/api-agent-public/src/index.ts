import { handleGetPublicProfile } from './handlers/profile'
import { handleStartConversation, handleSendMessage } from './handlers/conversation'
import { handleOgImage } from './handlers/og-image'

export interface Env {
  NEON_DATABASE_URL: string
  ANTHROPIC_API_KEY: string
  ENVIRONMENT: string
  FRONTEND_URL: string
}

function json(data: unknown, status: number, request?: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(request),
  })
}

function corsHeaders(request?: Request): Record<string, string> {
  const origin = request?.headers.get('Origin') || '*'
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token',
    'Access-Control-Max-Age': '86400',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
  }
}

// Simple in-memory rate limiter (per-isolate, resets on cold start)
const rateLimits = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimits.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= maxRequests) return false
  entry.count++
  return true
}

function getClientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown'
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    const url = new URL(request.url)

    // Health check
    if (url.pathname === '/health') {
      return json({ status: 'ok', service: 'tradgo-api-agent-public' }, 200, request)
    }

    // Rate limit by IP
    const ip = getClientIp(request)
    if (!checkRateLimit(`ip:${ip}`, 60, 60_000)) {
      return json({ error: 'Too many requests. Please try again shortly.' }, 429, request)
    }

    try {
      // GET /api/agent-public/:slug/profile
      const profileMatch = url.pathname.match(/^\/api\/agent-public\/([a-z0-9-]+)\/profile$/)
      if (profileMatch && request.method === 'GET') {
        return handleGetPublicProfile(request, env, profileMatch[1]!)
      }

      // GET /api/agent-public/:slug/status
      const statusMatch = url.pathname.match(/^\/api\/agent-public\/([a-z0-9-]+)\/status$/)
      if (statusMatch && request.method === 'GET') {
        return handleGetPublicProfile(request, env, statusMatch[1]!)
      }

      // GET /api/agent-public/:slug/og-image
      const ogMatch = url.pathname.match(/^\/api\/agent-public\/([a-z0-9-]+)\/og-image$/)
      if (ogMatch && request.method === 'GET') {
        return handleOgImage(request, env, ogMatch[1]!)
      }

      // POST /api/agent-public/:slug/conversation — start new conversation
      const convoMatch = url.pathname.match(/^\/api\/agent-public\/([a-z0-9-]+)\/conversation$/)
      if (convoMatch && request.method === 'POST') {
        return handleStartConversation(request, env, convoMatch[1]!)
      }

      // POST /api/agent-public/:slug/message — send follow-up message
      const msgMatch = url.pathname.match(/^\/api\/agent-public\/([a-z0-9-]+)\/message$/)
      if (msgMatch && request.method === 'POST') {
        return handleSendMessage(request, env, msgMatch[1]!)
      }

      return json({ error: 'Not found' }, 404, request)
    } catch (err) {
      console.error('Agent public API error:', err)
      return json({ error: 'Something went wrong' }, 500, request)
    }
  },
}
