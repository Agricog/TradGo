import type { ApiError } from '@/types'

const API_URL = import.meta.env.VITE_API_URL || ''

/**
 * API client for authenticated requests to the api-core Worker.
 * Automatically injects the Clerk JWT token from the session.
 *
 * Usage:
 *   const data = await api.get<MeResponse>('/api/me')
 *   const result = await api.post<Electrician>('/api/onboarding/details', body)
 */

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  /**
   * Get the Clerk session token.
   * Clerk stores the token and exposes it via __clerk_db_jwt cookie
   * or via the useAuth() hook. We access it via the global Clerk object.
   */
  private async getToken(): Promise<string | null> {
    try {
      // Access Clerk's global instance to get the session token
      const clerk = (window as unknown as Record<string, unknown>).Clerk as {
        session?: { getToken: () => Promise<string | null> }
      } | undefined

      if (clerk?.session) {
        return await clerk.session.getToken()
      }
      return null
    } catch {
      return null
    }
  }

  /**
   * Make an authenticated fetch request.
   * Throws on non-2xx responses with the error message from the API.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const token = await this.getToken()

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`

    const response = await fetch(url, {
      method,
      headers,
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      let errorMessage = `Request failed (${response.status})`
      try {
        const errorData = (await response.json()) as ApiError
        if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch {
        // Response wasn't JSON — use default message
      }
      throw new Error(errorMessage)
    }

    return (await response.json()) as T
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }
}

export const api = new ApiClient(API_URL)
