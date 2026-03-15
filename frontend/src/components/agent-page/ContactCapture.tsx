import { useState } from 'react'
import { Send } from 'lucide-react'
import type { AgentProfile } from './AgentPage'

const AGENT_API = import.meta.env.VITE_AGENT_PUBLIC_API_URL || ''

// UK phone: starts with 0 and has 10-11 digits, or starts with +44
const UK_PHONE_REGEX = /^(?:0\d{9,10}|\+44\d{9,10})$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function detectContactType(value: string): 'phone' | 'email' | null {
  const cleaned = value.replace(/\s/g, '')
  if (UK_PHONE_REGEX.test(cleaned)) return 'phone'
  if (EMAIL_REGEX.test(cleaned)) return 'email'
  return null
}

interface ContactCaptureProps {
  profile: AgentProfile
}

export default function ContactCapture({ profile }: ContactCaptureProps) {
  const [name, setName] = useState('')
  const [contact, setContact] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [sessionToken, setSessionToken] = useState<string | null>(null)

  // After first message, show simple input
  const [followUpText, setFollowUpText] = useState('')
  const [sendingFollowUp, setSendingFollowUp] = useState(false)

  const handleFirstMessage = async () => {
    setError('')

    const trimmedName = name.trim()
    const trimmedContact = contact.trim()
    const trimmedMessage = message.trim()

    if (trimmedName.length < 2) {
      setError('Please enter your name.')
      return
    }

    const contactType = detectContactType(trimmedContact)
    if (!contactType) {
      setError('Please enter a valid UK phone number or email address.')
      return
    }

    if (trimmedMessage.length < 10) {
      setError('Please describe what you need (at least a few words).')
      return
    }

    setSending(true)

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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as Record<string, string>).error || 'Failed to send')
      }

      const data = await res.json()
      setSessionToken((data as Record<string, string>).session_token || null)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleFollowUp = async () => {
    const text = followUpText.trim()
    if (!text || sendingFollowUp || !sessionToken) return

    setSendingFollowUp(true)

    try {
      await fetch(`${AGENT_API}/api/agent-public/${profile.slug}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken,
        },
        body: JSON.stringify({ message: text }),
      })
      setFollowUpText('')
    } catch {
      // Silently fail — message will appear to not send
    } finally {
      setSendingFollowUp(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (sent) {
        handleFollowUp()
      } else {
        handleFirstMessage()
      }
    }
  }

  // Simple follow-up input after first message sent
  if (sent) {
    return (
      <div className="flex items-end gap-2">
        <input
          type="text"
          value={followUpText}
          onChange={(e) => setFollowUpText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          className="flex-1 rounded-lg border border-surface-300 px-3 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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
    )
  }

  // First message form
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="agent-name" className="block text-xs text-surface-500 mb-1">
            Your name
          </label>
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
          <label htmlFor="agent-contact" className="block text-xs text-surface-500 mb-1">
            Phone or email
          </label>
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
          <label htmlFor="agent-message" className="block text-xs text-surface-500 mb-1">
            What do you need?
          </label>
          <input
            id="agent-message"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the job briefly"
            className="w-full rounded-lg border border-surface-300 px-3 py-2.5 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
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

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
