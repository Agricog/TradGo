import { useEffect, useRef } from 'react'
import { useAuth } from '@clerk/clerk-react'
import * as Ably from 'ably'

const ABLY_KEY = import.meta.env.VITE_ABLY_PUBLIC_KEY || ''

interface AblyCallbacks {
  onNewConversation?: () => void
  onApprovalNeeded?: () => void
  onEscalation?: () => void
  onMessageReceived?: () => void
}

/**
 * Subscribe to real-time inbox events for the current electrician.
 * Channel name: `electrician:{userId}`
 *
 * Events:
 *   - new_conversation
 *   - approval_needed
 *   - escalation
 *   - message_received
 *
 * Falls back gracefully if ABLY_KEY is not configured (polling handles updates).
 */
export function useAbly(callbacks: AblyCallbacks) {
  const { userId } = useAuth()
  const clientRef = useRef<Ably.Realtime | null>(null)
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

  useEffect(() => {
    if (!ABLY_KEY || !userId) return

    let channel: Ably.RealtimeChannel | null = null

    try {
      const client = new Ably.Realtime({
        key: ABLY_KEY,
        clientId: userId,
        echoMessages: false,
        disconnectedRetryTimeout: 5000,
        suspendedRetryTimeout: 15000,
      })

      clientRef.current = client
      const channelName = `electrician:${userId}`
      channel = client.channels.get(channelName)

      channel.subscribe('new_conversation', () => {
        callbacksRef.current.onNewConversation?.()
      })

      channel.subscribe('approval_needed', () => {
        callbacksRef.current.onApprovalNeeded?.()
      })

      channel.subscribe('escalation', () => {
        callbacksRef.current.onEscalation?.()
      })

      channel.subscribe('message_received', () => {
        callbacksRef.current.onMessageReceived?.()
      })
    } catch (err) {
      // Ably unavailable — polling fallback handles updates
      console.warn('Ably connection failed, using polling fallback:', err)
    }

    return () => {
      if (channel) {
        try { channel.unsubscribe() } catch (_) { /* ignore */ }
      }
      if (clientRef.current) {
        try { clientRef.current.close() } catch (_) { /* ignore */ }
        clientRef.current = null
      }
    }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps
}
