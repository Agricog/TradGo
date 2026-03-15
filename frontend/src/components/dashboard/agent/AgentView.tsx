import { useState, useEffect } from 'react'
import { Power, Plus, Lightbulb, Check, X, Pencil, Trash2, Link2, ExternalLink } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import QRCode from '@/components/ui/QRCode'

interface AgentRule {
  id: string
  rule_text: string
  active: boolean
}

interface RuleSuggestion {
  id: string
  suggestion_text: string
}

interface AgentProfile {
  first_name: string
  business_name: string | null
  area: string | null
  slug: string
  service_count: number
  priced_count: number
  verification_badges: { type: string; scheme: string | null; status: string }[]
  voice_duration: number | null
}

export default function AgentView() {
  const api = useApi()

  // Status
  const [status, setStatus] = useState<'live' | 'paused' | 'loading'>('loading')
  const [toggling, setToggling] = useState(false)

  // Rules
  const [rules, setRules] = useState<AgentRule[]>([])
  const [suggestions, setSuggestions] = useState<RuleSuggestion[]>([])
  const [newRule, setNewRule] = useState('')
  const [addingRule, setAddingRule] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  // Profile
  const [profile, setProfile] = useState<AgentProfile | null>(null)

  useEffect(() => {
    loadAll()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadAll() {
    try {
      const [statusRes, rulesRes, suggestionsRes, profileRes] = await Promise.all([
        api.get<{ status: string }>('/api/agent/status'),
        api.get<{ rules: AgentRule[] }>('/api/agent/rules'),
        api.get<{ suggestions: RuleSuggestion[] }>('/api/agent/suggestions'),
        api.get<AgentProfile>('/api/agent/profile'),
      ])
      setStatus(statusRes.status === 'live' ? 'live' : 'paused')
      setRules(rulesRes.rules || [])
      setSuggestions(suggestionsRes.suggestions || [])
      setProfile(profileRes)
    } catch {
      setStatus('paused')
    }
  }

  const toggleStatus = async () => {
    const next = status === 'live' ? 'paused' : 'live'
    setToggling(true)
    try {
      await api.put('/api/agent/status', { status: next })
      setStatus(next)
    } catch { /* no-op */ }
    setToggling(false)
  }

  const handleAddRule = async () => {
    const text = newRule.trim()
    if (!text || addingRule) return
    setAddingRule(true)
    try {
      await api.post('/api/agent/rules', { rule_text: text })
      setNewRule('')
      const res = await api.get<{ rules: AgentRule[] }>('/api/agent/rules')
      setRules(res.rules || [])
    } catch { /* no-op */ }
    setAddingRule(false)
  }

  const handleEditRule = async (id: string) => {
    const text = editText.trim()
    if (!text) return
    try {
      await api.put(`/api/agent/rules/${id}`, { rule_text: text })
      setEditingId(null)
      const res = await api.get<{ rules: AgentRule[] }>('/api/agent/rules')
      setRules(res.rules || [])
    } catch { /* no-op */ }
  }

  const handleDeleteRule = async (id: string) => {
    try {
      await api.delete(`/api/agent/rules/${id}`)
      setRules((prev) => prev.filter((r) => r.id !== id))
    } catch { /* no-op */ }
  }

  const handleAcceptSuggestion = async (id: string) => {
    try {
      await api.post(`/api/agent/suggestions/${id}`, { action: 'accept' })
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
      const res = await api.get<{ rules: AgentRule[] }>('/api/agent/rules')
      setRules(res.rules || [])
    } catch { /* no-op */ }
  }

  const handleDismissSuggestion = async (id: string) => {
    try {
      await api.post(`/api/agent/suggestions/${id}`, { action: 'dismiss' })
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
    } catch { /* no-op */ }
  }

  const agentUrl = profile?.slug ? `${window.location.origin}/agent/${profile.slug}` : null

  return (
    <div className="space-y-6">
      {/* ========== Status ========== */}
      <section className="bg-white border border-surface-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-surface-900">Your agent</h3>
            <p className="text-xs text-surface-500 mt-0.5">
              {status === 'live' ? 'Handling enquiries' : 'Customers see offline message'}
            </p>
          </div>
          <button
            type="button"
            onClick={toggleStatus}
            disabled={toggling || status === 'loading'}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              status === 'live'
                ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                : 'bg-brand-600 text-white hover:bg-brand-700'
            } disabled:opacity-50`}
          >
            <Power className="h-4 w-4" />
            {toggling ? '...' : status === 'live' ? 'Pause' : 'Go live'}
          </button>
        </div>
      </section>

      {/* ========== Rules ========== */}
      <section className="bg-white border border-surface-200 rounded-xl p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-surface-900">Agent rules</h3>
          <p className="text-xs text-surface-500 mt-0.5">
            Your agent follows these when talking to customers
          </p>
        </div>

        {/* Existing rules */}
        {rules.length > 0 && (
          <div className="space-y-2">
            {rules.map((rule, i) => (
              <div
                key={rule.id}
                className="flex items-start gap-2 bg-surface-50 rounded-lg p-3"
              >
                <span className="text-xs text-surface-400 mt-0.5 shrink-0">{i + 1}.</span>
                {editingId === rule.id ? (
                  <div className="flex-1 flex items-start gap-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 text-sm border border-surface-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleEditRule(rule.id) }}
                    />
                    <button type="button" onClick={() => handleEditRule(rule.id)} className="p-1 text-brand-600"><Check className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setEditingId(null)} className="p-1 text-surface-400"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <>
                    <p className="flex-1 text-sm text-surface-800">{rule.rule_text}</p>
                    <button type="button" onClick={() => { setEditingId(rule.id); setEditText(rule.rule_text) }} className="p-1 text-surface-400 hover:text-surface-600"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => handleDeleteRule(rule.id)} className="p-1 text-surface-400 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add rule */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newRule}
            onChange={(e) => setNewRule(e.target.value)}
            placeholder="e.g. I don't do commercial work"
            className="flex-1 text-sm border border-surface-300 rounded-lg px-3 py-2 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddRule() }}
          />
          <button
            type="button"
            onClick={handleAddRule}
            disabled={!newRule.trim() || addingRule}
            className="shrink-0 bg-brand-600 text-white p-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
            aria-label="Add rule"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {rules.length >= 30 && (
          <p className="text-xs text-amber-600">Maximum 30 rules reached.</p>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-surface-100">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <p className="text-xs font-medium text-surface-700">Suggested from your recent edits</p>
            </div>
            {suggestions.map((s) => (
              <div key={s.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-surface-800 mb-2">{s.suggestion_text}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAcceptSuggestion(s.id)}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    Add this rule
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismissSuggestion(s.id)}
                    className="text-xs text-surface-500 hover:text-surface-700"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ========== Profile ========== */}
      {profile && (
        <section className="bg-white border border-surface-200 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold text-surface-900">Agent profile</h3>

          <div className="space-y-2">
            <InfoRow label="Name" value={profile.business_name || profile.first_name} />
            <InfoRow label="Area" value={profile.area} />
            <InfoRow label="Services" value={`${profile.service_count} listed`} />
            <InfoRow label="Priced" value={`${profile.priced_count} of ${profile.service_count}`} />
          </div>

          {/* Verification badges */}
          <div className="space-y-1.5">
            <p className="text-xs text-surface-500 font-medium">Verification</p>
            {profile.verification_badges.length > 0 ? (
              profile.verification_badges.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className={`text-sm ${v.status === 'verified' ? 'text-brand-600' : 'text-surface-400'}`}>
                    {v.status === 'verified' ? '✅' : '⬜'}
                  </span>
                  <span className="text-sm text-surface-800">
                    {v.scheme || v.type} — {v.status === 'verified' ? 'Verified' : 'Pending'}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-surface-500">No verification yet</p>
            )}
          </div>

          {/* Voice */}
          {profile.voice_duration && (
            <div className="flex items-center gap-2">
              <span className="text-sm">🎙️</span>
              <span className="text-sm text-surface-700">
                Recorded {Math.floor(profile.voice_duration / 60)}:{String(profile.voice_duration % 60).padStart(2, '0')}
              </span>
            </div>
          )}

          {/* Agent link + QR */}
          {agentUrl && (
            <div className="pt-3 border-t border-surface-100 space-y-3">
              <p className="text-xs text-surface-500 font-medium">Your agent link</p>
              <div className="flex items-center gap-2 bg-surface-50 rounded-lg px-3 py-2">
                <Link2 className="h-4 w-4 text-surface-400 shrink-0" />
                <span className="text-sm text-surface-700 truncate flex-1">{agentUrl}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(agentUrl)}
                  className="shrink-0 text-brand-600 text-sm font-medium hover:text-brand-700"
                >
                  Copy
                </button>
              </div>
              <div className="flex items-center gap-4">
                <QRCode value={agentUrl} size={96} />
                <div>
                  <a
                    href={agentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-brand-600 font-medium hover:text-brand-700"
                  >
                    Preview page <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <p className="text-xs text-surface-500 mt-1">
                    Share this link or QR code on your van, cards, or email signature.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-surface-500">{label}</span>
      <span className="text-sm text-surface-900">{value}</span>
    </div>
  )
}
