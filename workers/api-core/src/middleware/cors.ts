const ALLOWED_ORIGINS = [
  'https://tradgo.co.uk',
  'https://www.tradgo.co.uk',
  'https://tradgo-production.up.railway.app',
]

// Add localhost for development
if (typeof process !== 'undefined') {
  ALLOWED_ORIGINS.push('http://localhost:3000')
}

/**
 * Return CORS headers based on request origin.
 * Only allows whitelisted origins.
 */
export function corsHeaders(request: Request): Record<string, string> {
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

/**
 * Security headers applied to every response.
 * Covers OWASP security misconfiguration requirements.
 */
export function securityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
  }
}

/**
 * Handle CORS preflight (OPTIONS) requests.
 */
export function handlePreflight(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  })
}
