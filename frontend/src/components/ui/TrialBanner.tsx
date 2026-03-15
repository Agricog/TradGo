import { useState, useEffect } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'
import { useApi } from '@/hooks/useApi'

interface BillingStatus {
  plan: string
  status: string
  trial_ends_at: string | null
  has_billing_account: boolean
}

export default function TrialBanner() {
  const api = useApi()
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [subscribing, setSubscribing] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.get<BillingStatus>('/api/billing/status').then((data) => {
      if (!cancelled) setBilling(data)
    }).catch(() => {})
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!billing) return null
  if (billing.status === 'active' && !billing.trial_ends_at) return null
  if (dismissed) return null

  // Calculate days remaining in trial
  let daysLeft: number | null = null
  if (billing.trial_ends_at) {
    const now = new Date()
    const trialEnd = new Date(billing.trial_ends_at)
    daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }

  const isExpired = billing.status === 'expired' || (daysLeft !== null && daysLeft <= 0)
  const isUrgent = daysLeft !== null && daysLeft <= 3

  const handleSubscribe = async (plan: string) => {
    setSubscribing(true)
    try {
      const data = await api.post<{ url: string }>('/api/billing/create-checkout', { plan })
      window.location.href = data.url
    } catch {
      setSubscribing(false)
    }
  }

  if (isExpired) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">Your trial has ended</p>
            <p className="text-xs text-red-600 mt-0.5">
              Your agent is paused. Subscribe to reactivate.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => handleSubscribe('solo')}
                disabled={subscribing}
                className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {subscribing ? 'Loading...' : 'Solo — £149/mo'}
              </button>
              <button
                type="button"
                onClick={() => handleSubscribe('growth')}
                disabled={subscribing}
                className="bg-white text-surface-700 text-sm font-medium px-4 py-2 rounded-lg border border-surface-200 hover:bg-surface-50 disabled:opacity-50 transition-colors"
              >
                Growth — £199/mo
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (daysLeft === null) return null

  return (
    <div className={`${isUrgent ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'} border rounded-xl p-4 mb-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Clock className={`h-5 w-5 shrink-0 mt-0.5 ${isUrgent ? 'text-amber-600' : 'text-blue-600'}`} />
          <div>
            <p className={`text-sm font-semibold ${isUrgent ? 'text-amber-800' : 'text-blue-800'}`}>
              {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left in your trial
            </p>
            <p className={`text-xs mt-0.5 ${isUrgent ? 'text-amber-600' : 'text-blue-600'}`}>
              Subscribe to keep your agent running.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleSubscribe('solo')}
                disabled={subscribing}
                className="bg-brand-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
              >
                {subscribing ? '...' : 'Subscribe — £149/mo'}
              </button>
            </div>
          </div>
        </div>
        {!isUrgent && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-xs text-surface-400 hover:text-surface-600"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}
