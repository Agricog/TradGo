import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Zap, Send } from 'lucide-react'
import ProfileHeader from './ProfileHeader'
import ChatArea, { type ChatMessage } from './ChatArea'
import AgentPageMeta from './AgentPageMeta'

const AGENT_API = import.meta.env.VITE_AGENT_PUBLIC_API_URL || ''

export interface AgentProfile {
  slug: string
  first_name: string
  business_name: string | null
  area: string | null
  phone: string | null
  is_live: boolean
  services: string[]
  badges: {
    type: string
    scheme: string | null
    reference_number: string | null
    detail: Record<string, unknown> | null
  }[]
}

// UK phone: starts with 0 and has 10-11 digits, or starts with +44
const UK_PHONE_REGEX = /^(?:0\d{9,10}|\+44\d{9,10})$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function detectContactType(value: string): 'phone' | 'email' | null {
  const cleaned = value.replace(/\s/g, '')
  if (UK_PHONE_REGEX.test(cleaned)) return 'phone'
  if (EMAIL_REGEX.test(cleaned)) return 'email'
  return null
}

let msgIdCounter = 0
function nextMsgId(): string {
  return `msg-${Date.now()}-${++msgIdCounter}`
}

export default function AgentPage() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const isEmbed = searchParams.get('embed') === 'true'
  const [profile, setProfile] = useState<AgentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [conversationStarted, setConversationStarted] = useState(false)
  const [typing, setTyping] = useState(false)

  // First message form
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [firstMessage, setFirstMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [sending, setSending] = useState(false)

  // Follow-up input
  const [followUpText, setFollowUpText] = useState('')
  const [sendingFollowUp, setSendingFollowUp] = useState(false)

  // Load profile
  useEffect(() => {
    if (!slug) return
    let cancelled = false

    async function loadProfile() {
      try {
        const res = await fetch(`${AGENT_API}/api/agent-public/${slug}/profile`)
        if (!res.ok) { if (!cancelled) setNotFound(true); return }
        const data = await res.json()
        if (!cancelled) {
          setProfile(data)
          // Add opening message
          setMessages([{
            id: nextMsgId(),
            role: 'agent',
            content: `Hi! I'm ${data.first_name}'s agent. I handle enquiries and quotes so ${data.first_name} can focus on the job.\n\nWhat can I help with?`,
            timestamp: new Date(),
          }])
        }
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProfile()
    return () => { cancelled = true }
  }, [slug])

  // Send first message (with contact capture)
  const handleFirstMessage = useCallback(async () => {
    if (!profile || sending) return
    setFormError('')

    const trimmedName = name.trim()
    const trimmedContact = contact.trim()
    const trimmedMessage = firstMessage.trim()

    if (trimmedName.length < 2) { setFormError('Please enter your name.'); return }
    const contactType = detectContactType(trimmedContact)
    if (!contactType) { setFormError('Please enter a valid UK phone number or email.'); return }
    if (trimmedMessage.length < 10) { setFormError('Please describe what you need (at least a few words).'); return }

    setSending(true)
    setTyping(true)

    // Add customer message to chat
    setMessages((prev) => [...prev, {
      id: nextMsgId(),
      role: 'customer',
      content: trimmedMessage,
      timestamp: new Date(),
    }])

    try {
      const res = await fetch(`${AGENT_API}/api/agent-public/${profile.slug}/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: trimmedName,
          customer_contact: trimmedContact,
          contact_type: contactType,
          message: trimmedMessage,
        }),
      })

      const data = await res.json() as {
        session_token?: string
        agent_response?: string | null
        awaiting_approval?: boolean
        opening_message?: string
        error?: string
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send')
      }

      if (data.session_token) setSessionToken(data.session_token)
      setConversationStarted(true)

      // Add agent response
      const responseText = data.agent_response || data.opening_message || `Thanks for getting in touch! I'm looking into this and will get back to you shortly.`
      setMessages((prev) => [...prev, {
        id: nextMsgId(),
        role: 'agent',
        content: responseText,
        timestamp: new Date(),
      }])

      if (data.awaiting_approval && !data.agent_response) {
        setMessages((prev) => [...prev, {
          id: nextMsgId(),
          role: 'system',
          content: `${profile.first_name} will review and get back to you shortly.`,
          timestamp: new Date(),
        }])
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      // Remove the customer message we optimistically added
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setSending(false)
      setTyping(false)
    }
  }, [profile, name, contact, firstMessage, sending])

  // Send follow-up message
  const handleFollowUp = useCallback(async () => {
    const text = followUpText.trim()
    if (!text || sendingFollowUp || !sessionToken || !profile) return

    setSendingFollowUp(true)
    setTyping(true)
    setFollowUpText('')

    // Add customer message to chat
    setMessages((prev) => [...prev, {
      id: nextMsgId(),
      role: 'customer',
      content: text,
      timestamp: new Date(),
    }])

    try {
      const res = await fetch(`${AGENT_API}/api/agent-public/${profile.slug}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken,
        },
        body: JSON.stringify({ message: text }),
      })

      const data = await res.json() as {
        agent_response?: string | null
        awaiting_approval?: boolean
        placeholder?: string
        error?: string
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send')
      }

      const responseText = data.agent_response || data.placeholder || `I'm checking on that — you'll hear back shortly.`
      setMessages((prev) => [...prev, {
        id: nextMsgId(),
        role: 'agent',
        content: responseText,
        timestamp: new Date(),
      }])
    } catch {
      setMessages((prev) => [...prev, {
        id: nextMsgId(),
        role: 'system',
        content: 'Message failed to send. Please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setSendingFollowUp(false)
      setTyping(false)
    }
  }, [profile, followUpText, sendingFollowUp, sessionToken])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (conversationStarted) handleFollowUp()
      else handleFirstMessage()
    }
  }

  // ========== Loading ==========
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Zap className="h-6 w-6 text-brand-600 animate-pulse" />
      </div>
    )
  }

  // ========== Not found ==========
  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <p className="text-surface-900 font-semibold text-lg mb-2">This agent page doesn't exist.</p>
        <p className="text-surface-500 text-sm text-center max-w-xs">
          The link might be wrong, or the electrician may have changed their page.
        </p>
      </div>
    )
  }

  // ========== Offline ==========
  if (!profile.is_live) {
    return (
      <div className="min-h-screen bg-white">
        <AgentPageMeta profile={profile} />
        <ProfileHeader profile={profile} />
        <div className="px-4 py-12 text-center">
          <p className="text-surface-900 font-medium mb-2">
            {profile.first_name}'s agent is currently offline.
          </p>
          {profile.phone && (
            <>
              <p className="text-surface-500 text-sm mb-4">
                You can reach {profile.first_name} directly:
              </p>
              <a
                href={`tel:${profile.phone}`}
                className="inline-flex items-center gap-2 bg-brand-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-brand-700 transition-colors"
              >
                Call {profile.first_name}
              </a>
            </>
          )}
        </div>
      </div>
    )
  }

  // ========== Live agent page ==========
  return (
    <div className={`${isEmbed ? 'h-screen' : 'min-h-screen'} bg-white flex flex-col`}>
      {/* SEO meta tags — skip in embed */}
      {!isEmbed && <AgentPageMeta profile={profile} />}

      {/* Zone 1: Profile header — compact in embed */}
      {!isEmbed && <ProfileHeader profile={profile} />}

      {/* Zone 2: Chat area */}
      <ChatArea messages={messages} typing={typing} firstName={profile.first_name} />

      {/* Zone 3: Input */}
      <div className="sticky bottom-0 bg-white border-t border-surface-200">
        <div className="max-w-lg mx-auto px-4 py-4">
          {conversationStarted ? (
            /* Follow-up input */
            <div className="flex items-end gap-2">
              <input
                type="text"
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={sendingFollowUp}
                className="flex-1 rounded-lg border border-surface-300 px-3 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50"
                autoFocus
              />
              <button
                type="button"
                onClick={handleFollowUp}
                disabled={!followUpText.trim() || sendingFollowUp}
                className="shrink-0 bg-brand-600 text-white p-2.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* First message form with contact capture */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="agent-name" className="block text-xs text-surface-500 mb-1">Your name</label>
                  <input
                    id="agent-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="First name"
                    className="w-full rounded-lg border border-surface-300 px-3 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="agent-contact" className="block text-xs text-surface-500 mb-1">Phone or email</label>
                  <input
                    id="agent-contact"
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="So they can follow up"
                    className="w-full rounded-lg border border-surface-300 px-3 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor="agent-message" className="block text-xs text-surface-500 mb-1">What do you need?</label>
                  <input
                    id="agent-message"
                    type="text"
                    value={firstMessage}
                    onChange={(e) => setFirstMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe the job briefly"
                    disabled={sending}
                    className="w-full rounded-lg border border-surface-300 px-3 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:opacity-50"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleFirstMessage}
                  disabled={sending}
                  className="shrink-0 bg-brand-600 text-white p-2.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              {formError && <p className="text-xs text-red-600">{formError}</p>}
            </div>
          )}
        </div>
        <p className="text-center text-[11px] text-surface-400 pb-3 px-4">
          Your name and contact details are shared with {profile.first_name} to handle your enquiry.
        </p>
      </div>
    </div>
  )
}
