import { useState, useEffect, useCallback, useRef } from 'react'
import { useApi } from '@/hooks/useApi'
import { useAbly } from '@/hooks/useAbly'
import type { Conversation } from '@/types'

export interface ConversationListItem extends Conversation {
  last_message: string | null
  last_message_role: string | null
  last_summary: string | null
}

interface ConversationsResponse {
  conversations: ConversationListItem[]
  total: number
}

const POLL_INTERVAL = 30_000 // 30 seconds fallback

export function useConversations() {
  const api = useApi()
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const mountedRef = useRef(true)

  const fetchConversations = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      try {
        const data = await api.get<ConversationsResponse>('/api/conversations?limit=100')
        if (mountedRef.current) {
          setConversations(data.conversations)
        }
      } catch (err) {
        console.error('Failed to fetch conversations:', err)
      } finally {
        if (mountedRef.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true
    fetchConversations()
    return () => { mountedRef.current = false }
  }, [fetchConversations])

  // Polling fallback
  useEffect(() => {
    const id = setInterval(() => fetchConversations(), POLL_INTERVAL)
    return () => clearInterval(id)
  }, [fetchConversations])

  // Real-time updates via Ably
  useAbly({
    onNewConversation: () => fetchConversations(),
    onApprovalNeeded: () => fetchConversations(),
    onEscalation: () => fetchConversations(),
    onMessageReceived: () => fetchConversations(),
  })

  const refresh = useCallback(() => fetchConversations(true), [fetchConversations])

  return { conversations, loading, refreshing, refresh }
}
