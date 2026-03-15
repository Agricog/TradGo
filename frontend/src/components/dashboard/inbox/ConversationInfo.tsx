import { X } from 'lucide-react'
import type { ConversationWithMessages } from '@/types'

interface ConversationInfoProps {
  conversation: ConversationWithMessages
  onClose: () => void
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-xs text-surface-500 shrink-0">{label}</span>
      <span className="text-sm text-surface-900 text-right">{value}</span>
    </div>
  )
}

function formatEstimate(from: number | null, to: number | null): string | null {
  if (!from && !to) return null
  if (from && to) return `£${from.toLocaleString()} – £${to.toLocaleString()}`
  if (from) return `From £${from.toLocaleString()}`
  if (to) return `Up to £${to.toLocaleString()}`
  return null
}

export default function ConversationInfo({ conversation, onClose }: ConversationInfoProps) {
  const c = conversation
  const estimate = formatEstimate(c.estimate_from, c.estimate_to)

  return (
    <div className="bg-white border-b border-surface-200 px-4 py-4 space-y-1 shrink-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-surface-900">Job details</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-surface-400 hover:text-surface-600"
          aria-label="Close details"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y divide-surface-100">
        <InfoRow label="Type" value={c.job_type} />
        <InfoRow label="Property" value={c.property_type} />
        <InfoRow label="Location" value={c.job_location_postcode} />
        <InfoRow label="Urgency" value={c.urgency ? c.urgency.charAt(0).toUpperCase() + c.urgency.slice(1) : null} />
        <InfoRow
          label="Estimate"
          value={estimate ? `${estimate}${c.estimate_approved ? ' (approved)' : ' (pending)'}` : null}
        />
        <InfoRow label="Visit" value={c.visit_confirmed ? (c.visit_datetime ? new Date(c.visit_datetime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Confirmed') : 'Not yet confirmed'} />
      </div>

      <div className="pt-3 mt-2 border-t border-surface-100">
        <p className="text-xs text-surface-500 mb-1">Customer</p>
        <div className="divide-y divide-surface-100">
          <InfoRow label="Name" value={c.customer_name} />
          <InfoRow label="Phone" value={c.customer_phone} />
          <InfoRow label="Email" value={c.customer_email} />
          <InfoRow label="Channel" value={c.channel?.toUpperCase()} />
          <InfoRow
            label="First contact"
            value={new Date(c.created_at).toLocaleDateString('en-GB', {
              day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          />
        </div>
      </div>
    </div>
  )
}
