import { verifyToken } from '@clerk/backend'
import type { Env } from '../index'

export interface AuthContext {
  userId: string
}

/**
 * Validate a Clerk JWT from the Authorization header.
 * Returns the authenticated user context or null if invalid.
 */
export async function authenticate(
  request: Request,
  env: Env
): Promise<AuthContext | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    })
    if (!payload.sub) return null
    return { userId: payload.sub }
  } catch {
    return null
  }
}
