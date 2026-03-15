import { corsHeaders, securityHeaders } from '../middleware/cors'

/**
 * Application error class with HTTP status code.
 * Use this to throw errors that map cleanly to HTTP responses.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Return a JSON response with CORS and security headers.
 */
export function json(data: unknown, status: number, request: Request): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(request),
      ...securityHeaders(),
    },
  })
}

/**
 * Return a JSON error response.
 * Never leaks sensitive info in production — uses generic messages.
 */
export function errorResponse(
  message: string,
  status: number,
  request: Request,
  code?: string
): Response {
  const body: Record<string, string> = { error: message }
  if (code) body.code = code
  return json(body, status, request)
}

/**
 * Handle unknown errors safely.
 * Logs the real error, returns a safe message to the client.
 */
export function handleError(
  err: unknown,
  request: Request,
  isProduction: boolean
): Response {
  console.error('Unhandled error:', err)

  if (err instanceof AppError) {
    return errorResponse(err.message, err.status, request, err.code)
  }

  const message = isProduction
    ? 'Internal server error'
    : err instanceof Error
      ? err.message
      : 'Unknown error'

  return errorResponse(message, 500, request)
}
