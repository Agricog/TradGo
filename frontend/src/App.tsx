import { ClerkProvider, SignIn, SignedIn, SignedOut } from '@clerk/clerk-react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Zap } from 'lucide-react'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is required — add it to your Railway environment variables.')
}

function AuthScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-50 px-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Zap className="h-8 w-8 text-brand-600" />
          <span className="text-2xl font-bold text-surface-900">TradGo</span>
        </div>
        <p className="text-surface-700 text-sm">Your AI agent for electrical enquiries</p>
      </div>
      <SignIn
        routing="hash"
        appearance={{
          elements: {
            rootBox: 'w-full max-w-md',
            card: 'shadow-lg rounded-xl',
            headerTitle: 'text-surface-900',
            formButtonPrimary: 'bg-brand-600 hover:bg-brand-700',
          },
        }}
      />
    </div>
  )
}

function DashboardShell() {
  return (
    <div className="min-h-screen bg-surface-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-surface-200">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-brand-600" />
            <span className="font-semibold text-surface-900">TradGo</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 px-2.5 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Agent Live
            </span>
          </div>
        </div>
      </header>

      {/* Main content area — placeholder for Batch 12+ */}
      <main className="px-4 py-6">
        <div className="max-w-lg mx-auto text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-50 mb-4">
            <Zap className="h-8 w-8 text-brand-600" />
          </div>
          <h1 className="text-xl font-semibold text-surface-900 mb-2">
            Your agent is live and ready
          </h1>
          <p className="text-surface-700 text-sm leading-relaxed">
            When a customer gets in touch, their conversation will appear here.
            Onboarding and inbox screens are coming in the next batches.
          </p>
        </div>
      </main>

      {/* Bottom tab bar — 4 tabs */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-surface-200">
        <div className="flex items-center justify-around h-16">
          <TabItem icon="inbox" label="Inbox" active />
          <TabItem icon="stats" label="Stats" />
          <TabItem icon="agent" label="Agent" />
          <TabItem icon="settings" label="Settings" />
        </div>
      </nav>
    </div>
  )
}

function TabItem({ icon, label, active = false }: { icon: string; label: string; active?: boolean }) {
  const colour = active ? 'text-brand-600' : 'text-surface-700'
  return (
    <button
      type="button"
      className={`flex flex-col items-center justify-center gap-0.5 w-16 ${colour}`}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
    >
      <TabIcon name={icon} className="h-5 w-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}

function TabIcon({ name, className }: { name: string; className?: string }) {
  // Minimal inline SVG icons to avoid extra Lucide bundle for nav
  const paths: Record<string, string> = {
    inbox: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    stats: 'M18 20V10M12 20V4M6 20v-6',
    agent: 'M12 2a5 5 0 0 1 5 5v1a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5zM20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2',
    settings: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name] ?? ''} />
      {name === 'settings' && <circle cx="12" cy="12" r="3" />}
    </svg>
  )
}

export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <BrowserRouter>
        <SignedOut>
          <Routes>
            <Route path="*" element={<AuthScreen />} />
          </Routes>
        </SignedOut>
        <SignedIn>
          <Routes>
            <Route path="/" element={<DashboardShell />} />
            {/* Onboarding routes — Batch 4+ */}
            <Route path="/onboarding/*" element={<DashboardShell />} />
            {/* Dashboard routes — Batch 12+ */}
            <Route path="/dashboard/*" element={<DashboardShell />} />
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SignedIn>
      </BrowserRouter>
    </ClerkProvider>
  )
}
