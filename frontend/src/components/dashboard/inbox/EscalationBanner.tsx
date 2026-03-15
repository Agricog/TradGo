import { AlertTriangle, Phone, CheckCircle } from 'lucide-react'

interface EscalationBannerProps {
  reason: string | null
  customerPhone: string | null
  onResolve: () => Promise<void>
}

export default function EscalationBanner({ reason, customerPhone, onResolve }: EscalationBannerProps) {
  return (
    <div className="bg-red-50 border-b border-red-200 px-4 py-3 shrink-0">
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-800">Escalated</p>
          {reason && <p className="text-sm text-red-700 mt-0.5">{reason}</p>}
          <p className="text-xs text-red-600 mt-1">
            Your agent directed the customer to contact you directly.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {customerPhone && (
          <a
            href={`tel:${customerPhone}`}
            className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-red-700 transition-colors"
          >
            <Phone className="h-4 w-4" />
            Call customer
          </a>
        )}
        <button
          type="button"
          onClick={onResolve}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm text-surface-700 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors"
        >
          <CheckCircle className="h-4 w-4" />
          Resolved
        </button>
      </div>
    </div>
  )
}
