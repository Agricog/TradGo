import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useConversations } from '@/hooks/useConversations'
import ConversationCard from './ConversationCard'
import EmptyInbox from './EmptyInbox'

type Filter = 'all' | 'action' | 'active' | 'completed'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'action', label: 'Needs action' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
]

export default function InboxList() {
  const [filter, setFilter] = useState<Filter>('all')
  const { conversations, loading, refreshing, refresh } = useConversations()

  // Apply client-side filter
  const filtered = conversations.filter((c) => {
    if (filter === 'all') return true
    if (filter === 'action') return c.status === 'awaiting_approval' || c.status === 'escalated'
    if (filter === 'active') return c.status === 'active'
    if (filter === 'completed') return c.status === 'completed' || c.status === 'archived'
    return true
  })

  // Priority sort: escalated → awaiting_approval → active → completed
  const sorted = [...filtered].sort((a, b) => {
    const priority = (s: string) => {
      if (s === 'escalated') return 0
      if (s === 'awaiting_approval') return 1
      if (s === 'active') return 2
      return 3
    }
    const p = priority(a.status) - priority(b.status)
    if (p !== 0) return p
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  if (loading && conversations.length === 0) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-2.5 w-2.5 rounded-full bg-surface-200 mt-1.5 shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="flex justify-between">
                  <div className="h-4 w-32 bg-surface-200 rounded" />
                  <div className="h-3 w-16 bg-surface-200 rounded" />
                </div>
                <div className="h-3.5 w-48 bg-surface-200 rounded" />
                <div className="h-3 w-full bg-surface-100 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Filter row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
        {FILTERS.map(({ value, label }) => {
          const count =
            value === 'action'
              ? conversations.filter((c) => c.status === 'awaiting_approval' || c.status === 'escalated').length
              : undefined
          return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`shrink-0 text-sm font-medium px-3 py-1.5 rounded-full transition-colors ${
                filter === value
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-surface-700 border border-surface-200'
              }`}
            >
              {label}
              {count !== undefined && count > 0 && (
                <span
                  className={`ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                    filter === value
                      ? 'bg-white/20 text-white'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}

        {/* Refresh button */}
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="shrink-0 ml-auto p-1.5 text-surface-500 hover:text-surface-700 transition-colors"
          aria-label="Refresh inbox"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Conversation list */}
      {sorted.length === 0 ? (
        filter === 'all' ? (
          <EmptyInbox />
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-surface-500">No conversations match this filter.</p>
          </div>
        )
      ) : (
        <div className="space-y-2">
          {sorted.map((conversation) => (
            <ConversationCard key={conversation.id} conversation={conversation} />
          ))}
        </div>
      )}
    </div>
  )
}
