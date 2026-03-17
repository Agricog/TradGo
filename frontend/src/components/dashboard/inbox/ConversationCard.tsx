import { useNavigate } from 'react-router-dom'
import { MessageSquare, Globe } from 'lucide-react'
import type { ConversationListItem } from '@/hooks/useConversations'

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)

  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function statusConfig(status: string): { colour: string; bg: string; label: string } {
  switch (status) {
    case 'escalated':
      return { colour: 'bg-red-500', bg: 'bg-red-50 border-red-100', label: 'Urgent' }
    case 'awaiting_approval':
      return { colour: 'bg-red-500', bg: 'bg-amber-50 border-amber-100', label: 'Needs approval' }
    case 'active':
      return { colour: 'bg-amber-400', bg: 'bg-white border-surface-200', label: 'Active' }
    case 'completed':
      return { colour: 'bg-brand-500', bg: 'bg-white border-surface-200', label: 'Completed' }
    default:
      return { colour: 'bg-surface-300', bg: 'bg-white border-surface-200', label: status }
  }
}

/** Inline WhatsApp icon */
function WhatsAppSmallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function ChannelBadge({ channel }: { channel: string }) {
  switch (channel) {
    case 'whatsapp':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-[#25D366] font-medium" title="WhatsApp">
          <WhatsAppSmallIcon className="h-3 w-3" />
          WA
        </span>
      )
    case 'sms':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-blue-500 font-medium" title="SMS">
          <MessageSquare className="h-3 w-3" />
          SMS
        </span>
      )
    case 'web':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-surface-500 font-medium" title="Web chat">
          <Globe className="h-3 w-3" />
          Web
        </span>
      )
    default:
      return null
  }
}

interface ConversationCardProps {
  conversation: ConversationListItem
}

export default function ConversationCard({ conversation }: ConversationCardProps) {
  const navigate = useNavigate()
  const { colour, bg } = statusConfig(conversation.status)

  const displayName = conversation.customer_name || conversation.customer_phone || 'Unknown'
  const jobLine = [conversation.job_type, conversation.job_location_postcode]
    .filter(Boolean)
    .join(' — ')

  return (
    <button
      type="button"
      onClick={() => navigate(`/dashboard/conversation/${conversation.id}`)}
      className={`w-full text-left rounded-xl p-4 border transition-shadow hover:shadow-sm active:scale-[0.99] ${bg}`}
    >
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <div className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${colour}`} aria-hidden="true" />

        <div className="flex-1 min-w-0">
          {/* Top row: name + channel badge + time */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-surface-900 truncate">{displayName}</span>
              <ChannelBadge channel={conversation.channel} />
            </div>
            <span className="text-xs text-surface-500 shrink-0">
              {relativeTime(conversation.updated_at)}
            </span>
          </div>

          {/* Job type + location */}
          {jobLine && (
            <p className="text-sm text-surface-700 mt-0.5 truncate">{jobLine}</p>
          )}

          {/* Summary line */}
          {conversation.last_summary && (
            <p className="text-xs text-surface-500 mt-1 truncate leading-relaxed">
              {conversation.last_summary}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
