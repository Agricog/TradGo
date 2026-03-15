/**
 * In-memory rate limiter for Cloudflare Workers.
 * Per-isolate — resets on cold start. Sufficient for v1.
 * Upgrade to Upstash Redis for distributed rate limiting when needed.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const limits = new Map<string, RateLimitEntry>()

// Clean up stale entries every 60 seconds
let lastCleanup = Date.now()
function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < 60_000) return
  lastCleanup = now
  for (const [key, entry] of limits) {
    if (now > entry.resetAt) limits.delete(key)
  }
}

/**
 * Check if a request is within rate limits.
 * Returns { allowed, remaining, retryAfter }
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; retryAfter: number } {
  cleanup()
  const now = Date.now()
  const entry = limits.get(key)

  if (!entry || now > entry.resetAt) {
    limits.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, retryAfter: 0 }
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, remaining: 0, retryAfter }
  }

  entry.count++
  return { allowed: true, remaining: maxRequests - entry.count, retryAfter: 0 }
}

/**
 * Get client IP from Cloudflare headers.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  )
}

/**
 * Create a rate-limited response with proper headers.
 */
export function rateLimitedResponse(retryAfter: number, request?: Request): Response {
  const origin = request?.headers.get('Origin') || '*'
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again shortly.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'Access-Control-Allow-Origin': origin,
      },
    }
  )
}
