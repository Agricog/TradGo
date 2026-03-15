import { useAuth } from '@clerk/clerk-react'
import { useCallback } from 'react'

const API_URL = import.meta.env.VITE_API_URL || ''

/**
 * Hook for making authenticated API requests.
 * Automatically injects the Clerk JWT token.
 *
 * Usage:
 *   const api = useApi()
 *   const data = await api.get<MeResponse>('/api/me')
 */
export function useApi() {
  const { getToken } = useAuth()

  const request = useCallback(
    async <T>(method: string, path: string, body?: unknown): Promise<T> => {
      const token = await getToken()

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const url = path.startsWith('http') ? path : `${API_URL}${path}`

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      if (!response.ok) {
        let errorMessage = `Request failed (${response.status})`
        try {
          const errorData = await response.json()
          if (errorData.error) errorMessage = errorData.error
        } catch {
          // not JSON
        }
        throw new Error(errorMessage)
      }

      return (await response.json()) as T
    },
    [getToken]
  )

  return {
    get: useCallback(<T,>(path: string) => request<T>('GET', path), [request]),
    post: useCallback(
      <T,>(path: string, body?: unknown) => request<T>('POST', path, body),
      [request]
    ),
    put: useCallback(
      <T,>(path: string, body?: unknown) => request<T>('PUT', path, body),
      [request]
    ),
    del: useCallback(<T,>(path: string) => request<T>('DELETE', path), [request]),
  }
}
