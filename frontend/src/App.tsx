import { useState, useEffect, lazy, Suspense } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom'
import {
  ClerkProvider,
  SignIn,
  SignedIn,
  SignedOut,
  useAuth,
} from '@clerk/clerk-react'
import { Zap } from 'lucide-react'

// Eager: landing page is the LCP target — visitors see this first
import LandingPage from './components/pages/LandingPage'

import { useApi } from './hooks/useApi'
import type { MeResponse } from './types'

// Lazy: everything else (onboarding, dashboard, auth-only routes)
const StepYou = lazy(() => import('./components/onboarding/StepYou'))
const StepServices = lazy(() => import('./components/onboarding/StepServices'))
const StepPricing = lazy(() => import('./components/onboarding/StepPricing'))
const StepVoice = lazy(() => import('./components/onboarding/StepVoice'))
const StepVerify = lazy(() => import('./components/onboarding/StepVerify'))
const StepGoLive = lazy(() => import('./components/onboarding/StepGoLive'))
const DashboardLayout = lazy(() => import('./components/dashboard/DashboardLayout'))
const InboxList = lazy(() => import('./components/dashboard/inbox/InboxList'))
const ConversationDetail = lazy(() => import('./components/dashboard/inbox/ConversationDetail'))
const StatsView = lazy(() => import('./components/dashboard/stats/StatsView'))
const AgentView = lazy(() => import('./components/dashboard/agent/AgentView'))
const SettingsView = lazy(() => import('./components/dashboard/settings/SettingsView'))
const AgentPage = lazy(() => import('./components/agent-page/AgentPage'))
const PrivacyPage = lazy(() => import('./components/pages/PrivacyPage'))
const TermsPage = lazy(() => import('./components/pages/TermsPage'))

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is required')
}

// ===========================================
// Loading fallback (used by Suspense)
// ===========================================
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="text-center">
        <Zap className="h-8 w-8 text-brand-600 mx-auto mb-3 animate-pulse" />
        <p className="text-sm text-surface-700">Loading...</p>
      </div>
    </div>
  )
}

// ===========================================
// Auth screen
// ===========================================
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

// ===========================================
// Dashboard tab wrappers
// ===========================================
function StatsTab() {
  return <StatsView />
}

function AgentTab() {
  return <AgentView />
}

function SettingsTab() {
  return <SettingsView />
}

// ===========================================
// App shell — checks onboarding state
// ===========================================
function AppShell() {
  const api = useApi()
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoaded } = useAuth()

  const [loading, setLoading] = useState(true)
  const [, setElectrician] = useState<MeResponse | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    let cancelled = false

    async function checkUser() {
      try {
        const data = await api.get<MeResponse>('/api/me')
        if (cancelled) return

        setElectrician(data)

        if (!data.exists) {
          if (!location.pathname.startsWith('/onboarding')) {
            navigate('/onboarding/you', { replace: true })
          }
        } else if (data.electrician) {
          const step = data.electrician.onboarding_step
          if (step < 7) {
            const steps = [
              '/onboarding/you',
              '/onboarding/you',
              '/onboarding/services',
              '/onboarding/pricing',
              '/onboarding/voice',
              '/onboarding/verify',
              '/onboarding/go-live',
            ]
            const target = steps[step] || '/onboarding/you'
            if (!location.pathname.startsWith('/onboarding')) {
              navigate(target, { replace: true })
            }
          } else if (data.electrician.agent_status === 'onboarding') {
            if (!location.pathname.startsWith('/onboarding')) {
              navigate('/onboarding/go-live', { replace: true })
            }
          } else {
            if (location.pathname.startsWith('/onboarding')) {
              navigate('/dashboard', { replace: true })
            } else if (location.pathname === '/') {
              navigate('/dashboard', { replace: true })
            }
          }
        }
      } catch (err) {
        console.error('Failed to check user:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    checkUser()
    return () => { cancelled = true }
  }, [isLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isLoaded || loading) {
    return <LoadingFallback />
  }

  return (
    <Routes>
      <Route path="/onboarding/you" element={<StepYou />} />
      <Route path="/onboarding/services" element={<StepServices />} />
      <Route path="/onboarding/pricing" element={<StepPricing />} />
      <Route path="/onboarding/voice" element={<StepVoice />} />
      <Route path="/onboarding/verify" element={<StepVerify />} />
      <Route path="/onboarding/go-live" element={<StepGoLive />} />

      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<InboxList />} />
        <Route path="stats" element={<StatsTab />} />
        <Route path="agent" element={<AgentTab />} />
        <Route path="settings" element={<SettingsTab />} />
        <Route path="conversation/:id" element={<ConversationDetail />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

// ===========================================
// Root app
// ===========================================
export default function App() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public pages — no auth required */}
            <Route path="/" element={<PublicOrDashboard />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/agent/:slug" element={<AgentPage />} />

            {/* Everything else goes through auth */}
            <Route path="*" element={<AuthGate />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ClerkProvider>
  )
}

/**
 * Show landing page to visitors, redirect to dashboard for signed-in users.
 */
function PublicOrDashboard() {
  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>
    </>
  )
}

function AuthGate() {
  return (
    <>
      <SignedOut>
        <Routes>
          <Route path="*" element={<AuthScreen />} />
        </Routes>
      </SignedOut>
      <SignedIn>
        <AppShell />
      </SignedIn>
    </>
  )
}
