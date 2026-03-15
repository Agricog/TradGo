import { useState, useEffect } from 'react'
import {
  MessageSquare,
  CheckCircle,
  PoundSterling,
  CalendarCheck,
  Clock,
  ThumbsUp,
} from 'lucide-react'
import { useApi } from '@/hooks/useApi'

type Period = 'week' | 'month' | 'all'

interface Stats {
  enquiries_count: number
  completed_count: number
  estimates_sent: number
  visits_booked: number
  avg_response_seconds: number | null
  approval_rate: number | null
  estimated_value_low: number | null
  estimated_value_high: number | null
}

const EMPTY_STATS: Stats = {
  enquiries_count: 0,
  completed_count: 0,
  estimates_sent: 0,
  visits_booked: 0,
  avg_response_seconds: null,
  approval_rate: null,
  estimated_value_low: null,
  estimated_value_high: null,
}

function formatSeconds(seconds: number | null): string {
  if (seconds === null) return '—'
  if (seconds < 60) return `<${Math.max(1, seconds)}s`
  return `${Math.round(seconds / 60)}m`
}

function formatMoney(low: number | null, high: number | null): string {
  if (!low && !high) return '—'
  const fmt = (n: number) => `£${n.toLocaleString()}`
  if (low && high) return `${fmt(low)} – ${fmt(high)}`
  return fmt(low || high || 0)
}

export default function StatsView() {
  const api = useApi()
  const [period, setPeriod] = useState<Period>('week')
  const [stats, setStats] = useState<Stats>(EMPTY_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    api
      .get<Stats>(`/api/stats/summary?period=${period}`)
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {
        if (!cancelled) setStats(EMPTY_STATS)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [period]) // eslint-disable-line react-hooks/exhaustive-deps

  const periods: { value: Period; label: string }[] = [
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' },
    { value: 'all', label: 'All time' },
  ]

  return (
    <div className="space-y-4">
      {/* Period toggle */}
      <div className="flex items-center gap-2">
        {periods.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setPeriod(value)}
            className={`text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
              period === value
                ? 'bg-brand-600 text-white'
                : 'bg-white text-surface-700 border border-surface-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stats cards */}
      <div className={`space-y-3 transition-opacity ${loading ? 'opacity-50' : 'opacity-100'}`}>
        {/* Primary: Visits booked + estimated value */}
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-brand-700 font-medium">Visits booked</p>
              <p className="text-3xl font-bold text-brand-900 mt-1">{stats.visits_booked}</p>
            </div>
            <CalendarCheck className="h-6 w-6 text-brand-600" />
          </div>
          {(stats.estimated_value_low || stats.estimated_value_high) && (
            <div className="mt-3 pt-3 border-t border-brand-200">
              <p className="text-xs text-brand-600 font-medium">Estimated value of booked work</p>
              <p className="text-lg font-semibold text-brand-900 mt-0.5">
                {formatMoney(stats.estimated_value_low, stats.estimated_value_high)}
              </p>
            </div>
          )}
        </div>

        {/* Grid: 2x2 */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<MessageSquare className="h-5 w-5 text-surface-500" />}
            label="Enquiries handled"
            value={String(stats.enquiries_count)}
          />
          <StatCard
            icon={<CheckCircle className="h-5 w-5 text-surface-500" />}
            label="Completed"
            value={String(stats.completed_count)}
          />
          <StatCard
            icon={<PoundSterling className="h-5 w-5 text-surface-500" />}
            label="Estimates sent"
            value={String(stats.estimates_sent)}
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-surface-500" />}
            label="Avg response"
            value={formatSeconds(stats.avg_response_seconds)}
          />
        </div>

        {/* Approval rate */}
        {stats.approval_rate !== null && (
          <div className="bg-white border border-surface-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-surface-500" />
                <span className="text-sm text-surface-700">Approved without edits</span>
              </div>
              <span className="text-lg font-semibold text-surface-900">
                {Math.round(stats.approval_rate)}%
              </span>
            </div>
            {/* Simple bar */}
            <div className="mt-2 h-2 bg-surface-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, stats.approval_rate)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="bg-white border border-surface-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">{icon}</div>
      <p className="text-2xl font-bold text-surface-900">{value}</p>
      <p className="text-xs text-surface-500 mt-0.5">{label}</p>
    </div>
  )
}
