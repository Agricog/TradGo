import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Zap, MessageSquare, BarChart3, Bot, Settings } from 'lucide-react'
import { useApi } from '@/hooks/useApi'

const TABS = [
  { to: '/dashboard', icon: MessageSquare, label: 'Inbox', end: true },
  { to: '/dashboard/stats', icon: BarChart3, label: 'Stats', end: false },
  { to: '/dashboard/agent', icon: Bot, label: 'Agent', end: false },
  { to: '/dashboard/settings', icon: Settings, label: 'Settings', end: false },
] as const

export default function DashboardLayout() {
  const api = useApi()
  const [agentStatus, setAgentStatus] = useState<'live' | 'paused' | 'loading'>('loading')

  useEffect(() => {
    let cancelled = false
    api.get<{ status: string }>('/api/agent/status').then((res) => {
      if (!cancelled) setAgentStatus(res.status === 'live' ? 'live' : 'paused')
    }).catch(() => {
      if (!cancelled) setAgentStatus('paused')
    })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-surface-50 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-surface-200">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-brand-600" />
            <span className="font-semibold text-surface-900">TradGo</span>
          </div>
          {agentStatus !== 'loading' && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                agentStatus === 'live'
                  ? 'text-brand-700 bg-brand-50'
                  : 'text-amber-700 bg-amber-50'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  agentStatus === 'live' ? 'bg-brand-500' : 'bg-amber-500'
                }`}
              />
              {agentStatus === 'live' ? 'Agent Live' : 'Agent Paused'}
            </span>
          )}
        </div>
      </header>

      {/* Page content */}
      <main className="px-4 py-4">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-surface-200"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {TABS.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 w-16 transition-colors ${
                  isActive ? 'text-brand-600' : 'text-surface-500'
                }`
              }
              aria-label={label}
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
