import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Phone, Info, Zap, Star } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { useConversationActions } from '@/hooks/useConversationActions'
import type { ConversationWithMessages } from '@/types'
import MessageBubble from '@/components/ui/MessageBubble'
import ApprovalBanner from './ApprovalBanner'
import EscalationBanner from './EscalationBanner'
import ConversationInfo from './ConversationInfo'

export default function ConversationDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const api = useApi()
  const actions = useConversationActions(id!)

  const [conversation, setConversation] = useState<ConversationWithMessages | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [reviewSending, setReviewSending] = useState(false)
  const [reviewSent, setReviewSent] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchConversation = async () => {
    try {
      const data = await api.get<ConversationWithMessages>(`/api/conversations/${id}`)
      setConversation(data)
      if (data.conversation?.job_status === 'review_requested') {
        setReviewSent(true)
      }
    } catch (err) {
      setError('Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversation()
    pollRef.current = setInterval(fetchConversation, 10_000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages.length])

  const handleApprove = async (messageId: string) => {
    const ok = await actions.approve(messageId)
    if (ok) fetchConversation()
  }

  const handleEdit = async (messageId: string, content: string) => {
    const ok = await actions.edit(messageId, content)
    if (ok) fetchConversation()
  }

  const handleReject = async (messageId: string) => {
    const ok = await actions.reject(messageId)
    if (ok) fetchConversation()
  }

  const handleReply = async () => {
    const text = replyText.trim()
    if (!text || sending) return
    setSending(true)
    const ok = await actions.reply(text)
    if (ok) {
      setReplyText('')
      fetchConversation()
    }
    setSending(false)
  }

  const handleRequestReview = async () => {
    if (reviewSending || reviewSent) return
    setReviewSending(true)
    const sent = await actions.requestReview()
    if (sent) {
      setReviewSent(true)
      fetchConversation()
    }
    setReviewSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleReply()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <Zap className="h-6 w-6 text-brand-600 animate-pulse" />
      </div>
    )
  }

  if (error || !conversation) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-600 mb-4">{error || 'Conversation not found'}</p>
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="text-sm text-brand-600 font-medium"
        >
          Back to inbox
        </button>
      </div>
    )
  }

  const conv = conversation.conversation || conversation
  const displayName = conv.customer_name || conv.customer_phone || 'Customer'
  const jobLine = [conv.job_type, conv.job_location_postcode].filter(Boolean).join(' — ')
  const pendingMessage = conversation.messages.find(
    (m) => m.role === 'agent' && m.classification === 'needs_approval' && !m.approved && !m.sent
  )
  const isEscalated = conv.status === 'escalated'
  const isCompleted = conv.status === 'completed'
  const customerPhone = conv.customer_phone
  const jobStatus = conv.job_status

  return (
    <div className="fixed inset-0 z-50 bg-surface-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-surface-200 px-4 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-surface-700 hover:text-surface-900 -ml-1 p-1"
            aria-label="Back to inbox"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="font-medium text-surface-900 truncate text-sm">{displayName}</p>
            {jobLine && <p className="text-xs text-surface-500 truncate">{jobLine}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {customerPhone && (
            <a
              href={`tel:${customerPhone}`}
              className="p-2 text-surface-500 hover:text-surface-700"
              aria-label={`Call ${displayName}`}
            >
              <Phone className="h-5 w-5" />
            </a>
          )}
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 transition-colors ${showInfo ? 'text-brand-600' : 'text-surface-500 hover:text-surface-700'}`}
            aria-label="Job details"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Info panel (slides down) */}
      {showInfo && <ConversationInfo conversation={conversation} onClose={() => setShowInfo(false)} />}

      {/* Escalation banner */}
      {isEscalated && (
        <EscalationBanner
          reason={conv.escalation_reason}
          customerPhone={customerPhone}
          onResolve={async () => {
            await actions.complete()
            fetchConversation()
          }}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {conversation.messages
          .filter((m) => {
            // Hide unsent agent messages that aren't the current pending one
            if (m.role === 'agent' && !m.sent && m.id !== pendingMessage?.id) return false
            return true
          })
          .map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

        {/* Pending approval */}
        {pendingMessage && (
          <ApprovalBanner
            message={pendingMessage}
            onApprove={handleApprove}
            onEdit={handleEdit}
            onReject={handleReject}
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Review request button for completed conversations */}
      {isCompleted && customerPhone && (
        <div className="bg-surface-50 border-t border-surface-200 px-4 py-3 shrink-0">
          {reviewSent || jobStatus === 'review_requested' ? (
            <div className="flex items-center justify-center gap-2 text-sm text-brand-600">
              <Star className="h-4 w-4 fill-brand-600" />
              <span>Review request sent</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleRequestReview}
              disabled={reviewSending}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
            >
              <Star className="h-4 w-4" />
              {reviewSending ? 'Sending...' : 'Request Google review'}
            </button>
          )}
        </div>
      )}

      {/* Reply input — only show for non-completed conversations */}
      {!isCompleted && (
        <div className="bg-white border-t border-surface-200 px-4 py-3 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a reply..."
              rows={1}
              className="flex-1 resize-none rounded-lg border border-surface-300 px-3 py-2 text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleReply}
              disabled={!replyText.trim() || sending}
              className="shrink-0 bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
          <p className="text-[11px] text-surface-400 mt-1">
            Sending a manual reply pauses the agent for this conversation for 24 hours.
          </p>
        </div>
      )}
    </div>
  )
}
