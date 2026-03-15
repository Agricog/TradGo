import { useNavigate } from 'react-router-dom'
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
          {/* Top row: name + time */}
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-surface-900 truncate">{displayName}</span>
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
