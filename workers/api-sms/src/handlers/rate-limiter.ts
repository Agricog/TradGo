/**
 * Simple in-memory rate limiter for SMS.
 * Uses Cloudflare Workers global scope (per-isolate, not distributed).
 *
 * Limits:
 * - 20 messages per conversation per hour
 * - 50 new conversations per electrician per day
 *
 * NOTE: This is per-isolate only. For distributed rate limiting,
 * Upstash Redis will be added in Batch 14. This provides basic
 * protection against runaway conversations in the meantime.
 */

interface RateBucket {
  count: number
  resetAt: number
}

const conversationLimits = new Map<string, RateBucket>()
const electricianDailyLimits = new Map<string, RateBucket>()

const CONVERSATION_HOUR_LIMIT = 20
const ELECTRICIAN_DAILY_LIMIT = 50

function cleanExpired(map: Map<string, RateBucket>): void {
  const now = Date.now()
  for (const [key, bucket] of map) {
    if (bucket.resetAt <= now) {
      map.delete(key)
    }
  }
}

/**
 * Check if a conversation has exceeded the hourly message limit.
 * Returns true if the message should be allowed.
 */
export function checkConversationRate(conversationId: string): {
  allowed: boolean
  remaining: number
} {
  cleanExpired(conversationLimits)

  const now = Date.now()
  const bucket = conversationLimits.get(conversationId)

  if (!bucket || bucket.resetAt <= now) {
    conversationLimits.set(conversationId, {
      count: 1,
      resetAt: now + 60 * 60 * 1000, // 1 hour
    })
    return { allowed: true, remaining: CONVERSATION_HOUR_LIMIT - 1 }
  }

  if (bucket.count >= CONVERSATION_HOUR_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  bucket.count++
  return { allowed: true, remaining: CONVERSATION_HOUR_LIMIT - bucket.count }
}

/**
 * Check if an electrician has exceeded the daily new conversation limit.
 * Returns true if a new conversation should be allowed.
 */
export function checkElectricianDailyRate(electricianId: string): {
  allowed: boolean
  remaining: number
} {
  cleanExpired(electricianDailyLimits)

  const now = Date.now()
  const bucket = electricianDailyLimits.get(electricianId)

  if (!bucket || bucket.resetAt <= now) {
    electricianDailyLimits.set(electricianId, {
      count: 1,
      resetAt: now + 24 * 60 * 60 * 1000, // 24 hours
    })
    return { allowed: true, remaining: ELECTRICIAN_DAILY_LIMIT - 1 }
  }

  if (bucket.count >= ELECTRICIAN_DAILY_LIMIT) {
    return { allowed: false, remaining: 0 }
  }

  bucket.count++
  return { allowed: true, remaining: ELECTRICIAN_DAILY_LIMIT - bucket.count }
}
