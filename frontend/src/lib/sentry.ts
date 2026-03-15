import * as Sentry from '@sentry/react'

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || ''

/**
 * Initialize Sentry error tracking.
 * Safe to call even if DSN is not configured — silently no-ops.
 */
export function initSentry() {
  if (!SENTRY_DSN) {
    console.info('Sentry DSN not configured — error tracking disabled')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE || 'production',
    tracesSampleRate: 0.1, // Sample 10% of transactions
    replaysSessionSampleRate: 0.05, // 5% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    beforeSend(event) {
      // Strip sensitive data
      if (event.request?.headers) {
        delete event.request.headers['Authorization']
        delete event.request.headers['X-Session-Token']
      }
      // Strip PII from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => {
          if (b.data?.url && typeof b.data.url === 'string') {
            // Remove query params that might contain tokens
            try {
              const url = new URL(b.data.url)
              url.search = ''
              b.data.url = url.toString()
            } catch { /* keep original */ }
          }
          return b
        })
      }
      return event
    },

    // Don't send errors from browser extensions
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  })
}

/**
 * Set the current user context for Sentry.
 * Call after auth is confirmed.
 */
export function setSentryUser(userId: string, email?: string) {
  if (!SENTRY_DSN) return
  Sentry.setUser({ id: userId, email })
}

/**
 * Clear user context on sign out.
 */
export function clearSentryUser() {
  if (!SENTRY_DSN) return
  Sentry.setUser(null)
}

/**
 * Capture an error with additional context.
 */
export function captureError(error: unknown, context?: string) {
  console.error(context ? `${context}:` : 'Error:', error)
  if (!SENTRY_DSN) return

  Sentry.captureException(error, {
    tags: context ? { context } : undefined,
  })
}
