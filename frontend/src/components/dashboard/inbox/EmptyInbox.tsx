import { MessageSquare, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApi } from '@/hooks/useApi'

export default function EmptyInbox() {
  const api = useApi()
  const [agentSlug, setAgentSlug] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api.get<{ slug: string }>('/api/agent/profile').then((res) => {
      if (!cancelled) setAgentSlug(res.slug)
    }).catch(() => { /* no-op */ })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const agentUrl = agentSlug
    ? `${window.location.origin}/agent/${agentSlug}`
    : null

  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-50 mb-4">
        <MessageSquare className="h-7 w-7 text-brand-600" />
      </div>

      <h2 className="text-lg font-semibold text-surface-900 mb-1">
        Your agent is live and ready
      </h2>
      <p className="text-sm text-surface-600 leading-relaxed max-w-xs mx-auto mb-6">
        When a customer gets in touch, their conversation will appear here.
      </p>

      {agentUrl && (
        <div className="space-y-3">
          <p className="text-xs text-surface-500">Share your agent link to start getting enquiries:</p>
          <div className="inline-flex items-center gap-2 bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm">
            <span className="text-surface-700 truncate max-w-[200px]">{agentUrl}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(agentUrl)}
              className="shrink-0 text-brand-600 font-medium hover:text-brand-700 transition-colors"
            >
              Copy
            </button>
          </div>
          <div>
            <a
              href={agentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-brand-600 font-medium hover:text-brand-700 transition-colors"
            >
              Preview your agent page
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
