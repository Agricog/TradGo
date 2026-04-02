import { useCallback } from 'react'
import { useApi } from '@/hooks/useApi'

/**
 * Actions for a single conversation.
 * Each method calls the corresponding API endpoint and returns success/failure.
 */
export function useConversationActions(conversationId: string) {
  const api = useApi()

  const approve = useCallback(
    async (messageId: string): Promise<boolean> => {
      try {
        await api.post(`/api/conversations/${conversationId}/approve`, { message_id: messageId })
        return true
      } catch (err) {
        console.error('Approve failed:', err)
        return false
      }
    },
    [conversationId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const edit = useCallback(
    async (messageId: string, content: string): Promise<boolean> => {
      try {
        await api.post(`/api/conversations/${conversationId}/edit`, {
          message_id: messageId,
          content,
        })
        return true
      } catch (err) {
        console.error('Edit failed:', err)
        return false
      }
    },
    [conversationId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const reject = useCallback(
    async (messageId: string): Promise<boolean> => {
      try {
        await api.post(`/api/conversations/${conversationId}/reject`, { message_id: messageId })
        return true
      } catch (err) {
        console.error('Reject failed:', err)
        return false
      }
    },
    [conversationId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const reply = useCallback(
    async (content: string): Promise<boolean> => {
      try {
        await api.post(`/api/conversations/${conversationId}/reply`, { content })
        return true
      } catch (err) {
        console.error('Reply failed:', err)
        return false
      }
    },
    [conversationId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const complete = useCallback(
    async (): Promise<boolean> => {
      try {
        await api.post(`/api/conversations/${conversationId}/complete`, {})
        return true
      } catch (err) {
        console.error('Complete failed:', err)
        return false
      }
    },
    [conversationId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const requestReview = useCallback(
    async (): Promise<boolean> => {
      try {
        const result = await api.post<{ success: boolean; review_sent: boolean }>(
          `/api/conversations/${conversationId}/request-review`,
          {}
        )
        return result.review_sent
      } catch (err) {
        console.error('Request review failed:', err)
        return false
      }
    },
    [conversationId] // eslint-disable-line react-hooks/exhaustive-deps
  )

  return { approve, edit, reject, reply, complete, requestReview }
}
