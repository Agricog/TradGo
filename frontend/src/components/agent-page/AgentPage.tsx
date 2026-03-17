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
  whatsapp_number: string | null
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

/**
 * Format phone for wa.me link — needs country code without +
 * e.g. +447123456789 → 447123456789
 */
function formatWhatsAppLink(phone: string, firstName: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '')
  // If starts with 0, replace with 44 (UK)
  const international = cleaned.startsWith('0') ? `44${cleaned.slice(1)}` : cleaned
  const text = encodeURIComponent(`Hi, I found you on TradGo and I've got an electrical job I need help with.`)
  return `https://wa.me/${international}?text=${text}`
}

/** WhatsApp icon as inline SVG */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
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

      {/* WhatsApp quick-contact bar — only if electrician has WhatsApp set up */}
      {profile.whatsapp_number && !conversationStarted && (
        <div className="bg-white border-b border-surface-100 px-4 py-3">
          <div className="max-w-lg mx-auto">
            <a
              href={formatWhatsAppLink(profile.whatsapp_number, profile.first_name)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-medium py-3 rounded-lg transition-colors"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Message via WhatsApp
            </a>
            <p className="text-center text-xs text-surface-400 mt-2">
              or use the chat below
            </p>
          </div>
        </div>
      )}

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
