import { useState, useEffect } from 'react'
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
import StepYou from './components/onboarding/StepYou'
import StepServices from './components/onboarding/StepServices'
import StepPricing from './components/onboarding/StepPricing'
import StepVoice from './components/onboarding/StepVoice'
import StepVerify from './components/onboarding/StepVerify'
import StepGoLive from './components/onboarding/StepGoLive'
import DashboardLayout from './components/dashboard/DashboardLayout'
import InboxList from './components/dashboard/inbox/InboxList'
import ConversationDetail from './components/dashboard/inbox/ConversationDetail'
import { useApi } from './hooks/useApi'
import type { MeResponse } from './types'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is required')
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
// Placeholder screens for unbuilt tabs
// ===========================================

function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-100 mb-4">
        <Zap className="h-7 w-7 text-surface-400" />
      </div>
      <h2 className="text-lg font-semibold text-surface-900 mb-1">{title}</h2>
      <p className="text-sm text-surface-600">{description}</p>
    </div>
  )
}

function StatsTab() {
  return <PlaceholderTab title="Stats" description="Performance metrics coming in Batch 14." />
}

function AgentTab() {
  return <PlaceholderTab title="Agent" description="Agent management coming in Batch 15." />
}

function SettingsTab() {
  return <PlaceholderTab title="Settings" description="Account settings coming in Batch 15." />
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="text-center">
          <Zap className="h-8 w-8 text-brand-600 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-surface-700">Loading...</p>
        </div>
      </div>
    )
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
        <SignedOut>
          <Routes>
            <Route path="*" element={<AuthScreen />} />
          </Routes>
        </SignedOut>
        <SignedIn>
          <AppShell />
        </SignedIn>
      </BrowserRouter>
    </ClerkProvider>
  )
}
