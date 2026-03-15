/**
 * Security headers applied to all Worker responses.
 * Follows OWASP 2024 recommendations.
 */

export function applySecurityHeaders(response: Response, isPublicAgentPage = false): Response {
  const headers = new Headers(response.headers)

  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff')

  // Clickjacking protection — allow SAMEORIGIN for agent page (widget iframe)
  headers.set('X-Frame-Options', isPublicAgentPage ? 'SAMEORIGIN' : 'DENY')

  // HTTPS enforcement (1 year)
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  // Referrer policy — send origin only on cross-origin
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy — disable unnecessary browser features
  headers.set(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(self), payment=(), usb=()'
  )

  // Prevent caching of API responses with sensitive data
  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-store')
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
