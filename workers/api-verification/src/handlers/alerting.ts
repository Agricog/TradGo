import type { Env } from '../index'

interface AlertPayload {
  level: 'info' | 'warning' | 'error'
  message: string
  context?: Record<string, unknown>
}

/**
 * Send an alert when verification processing fails.
 *
 * For v1: logs to console (visible in Cloudflare dashboard logs).
 * Future: sends to Sentry, email, or Slack webhook.
 *
 * Key failure scenarios:
 * - Register page structure changed (scraper broke) → most common
 * - Register returned unexpected response
 * - OCR confidence too low
 * - Network timeout to register
 */
export async function sendAlert(env: Env, payload: AlertPayload): Promise<void> {
  const timestamp = new Date().toISOString()

  // Always log — visible in Cloudflare Workers logs
  console.error(`[ALERT][${payload.level.toUpperCase()}] ${timestamp}`, {
    message: payload.message,
    context: payload.context,
    service: 'tradgo-api-verification',
    environment: env.ENVIRONMENT,
  })

  // Future: Sentry integration
  // if (env.SENTRY_DSN) {
  //   await sendToSentry(env.SENTRY_DSN, payload)
  // }

  // Future: Slack webhook for critical alerts
  // if (payload.level === 'error') {
  //   await sendToSlack(env.SLACK_WEBHOOK_URL, payload)
  // }
}

/**
 * Check if a scraper is likely broken based on error patterns.
 * Call this from the registration handler when lookups fail.
 */
export function isLikelyScraperBreakage(error: Error): boolean {
  const breakageSignals = [
    'unexpected token',     // HTML structure changed
    'cannot read propert',  // Selector returned null
    'no results container', // Page layout changed
    'status 403',           // Blocked by WAF
    'status 503',           // Service down
    'timeout',              // Network issue
  ]

  const message = error.message.toLowerCase()
  return breakageSignals.some((signal) => message.includes(signal))
}

/**
 * Record a verification attempt for audit logging.
 * Tracks all attempts regardless of success/failure.
 */
export function buildAuditEntry(
  verificationId: string,
  scheme: string,
  result: 'success' | 'failure' | 'error',
  details?: string
): Record<string, unknown> {
  return {
    verification_id: verificationId,
    scheme,
    result,
    details: details || null,
    timestamp: new Date().toISOString(),
    service: 'tradgo-api-verification',
  }
}
