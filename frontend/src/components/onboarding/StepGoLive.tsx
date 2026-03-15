import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Copy, Check, MessageSquare, ExternalLink } from 'lucide-react'
import OnboardingLayout from './OnboardingLayout'
import { useApi } from '@/hooks/useApi'

interface GoLiveData {
  first_name: string
  business_name: string | null
  agent_page_url: string
  slug: string
}

export default function StepGoLive() {
  const navigate = useNavigate()
  const api = useApi()

  const [data, setData] = useState<GoLiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const result = await api.get<GoLiveData>('/api/onboarding/go-live')
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) setError('Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleCopy = async () => {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.agent_page_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const input = document.createElement('input')
      input.value = data.agent_page_url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleActivate = async () => {
    setActivating(true)
    setError('')

    try {
      await api.post('/api/onboarding/activate', {})
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate')
    } finally {
      setActivating(false)
    }
  }

  if (loading) {
    return (
      <OnboardingLayout step={7} totalSteps={7} title="Loading...">
        <div className="py-12 text-center text-surface-700 text-sm">Preparing your agent...</div>
      </OnboardingLayout>
    )
  }

  const displayName = data?.business_name || data?.first_name || 'Your'

  return (
    <OnboardingLayout
      step={7}
      totalSteps={7}
      title="Meet your agent"
      onBack={() => navigate('/onboarding/verify')}
      onNext={handleActivate}
      nextLabel={activating ? 'Activating...' : 'Activate agent'}
      loading={activating}
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
      )}

      {/* Agent preview */}
      <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
        <div className="bg-brand-50 px-4 py-3 border-b border-surface-200">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-brand-600" />
            <span className="text-sm font-medium text-brand-700">Agent preview</span>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Simulated conversation */}
          <div className="space-y-2.5">
            {/* Customer message */}
            <div className="flex justify-start">
              <div className="bg-surface-100 rounded-2xl rounded-tl-md px-3.5 py-2 max-w-[80%]">
                <p className="text-sm text-surface-900">
                  Hi, I need someone to look at my consumer unit. It&rsquo;s an old one with rewirable fuses.
                </p>
              </div>
            </div>

            {/* Agent response */}
            <div className="flex justify-end">
              <div className="bg-brand-600 rounded-2xl rounded-tr-md px-3.5 py-2 max-w-[80%]">
                <p className="text-sm text-white">
                  Hi! Yeah, {data?.first_name} does consumer unit upgrades all the time. Is it a house or a flat, and roughly how many circuits are you running?
                </p>
              </div>
            </div>

            {/* Customer reply */}
            <div className="flex justify-start">
              <div className="bg-surface-100 rounded-2xl rounded-tl-md px-3.5 py-2 max-w-[80%]">
                <p className="text-sm text-surface-900">
                  3-bed semi, maybe 8 or 9 circuits?
                </p>
              </div>
            </div>

            {/* Agent estimate */}
            <div className="flex justify-end">
              <div className="bg-brand-600 rounded-2xl rounded-tr-md px-3.5 py-2 max-w-[80%]">
                <p className="text-sm text-white">
                  That&rsquo;s pretty standard. {data?.first_name} would typically be looking at around £850&ndash;£1,100 for a full upgrade. Want me to get a time sorted?
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-surface-700 text-center pt-1">
            Your agent sounds like you and uses your pricing
          </p>
        </div>
      </div>

      {/* Agent link */}
      <div className="rounded-xl border border-surface-200 bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold text-surface-900">Your agent link</h3>
        <p className="text-xs text-surface-700">
          Share this with customers &mdash; they can chat with your agent to get quotes.
        </p>

        <div className="flex items-center gap-2">
          <div className="flex-1 px-3 py-2 bg-surface-50 border border-surface-200 rounded-lg text-sm text-surface-900 truncate">
            {data?.agent_page_url || 'tradgo.co.uk/agent/...'}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-900 text-white text-sm font-medium rounded-lg hover:bg-surface-800 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* What happens next */}
      <div className="rounded-xl border border-surface-200 bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold text-surface-900">What happens next</h3>
        <div className="space-y-2.5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="h-3.5 w-3.5 text-brand-600" />
            </div>
            <p className="text-sm text-surface-700">
              When a customer messages your agent, you&rsquo;ll get a notification
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
              <Check className="h-3.5 w-3.5 text-brand-600" />
            </div>
            <p className="text-sm text-surface-700">
              Just tap approve, tweak, or reject. That&rsquo;s it.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center flex-shrink-0">
              <ExternalLink className="h-3.5 w-3.5 text-brand-600" />
            </div>
            <p className="text-sm text-surface-700">
              Drop your agent link in your email signature, Google listing, or van signage
            </p>
          </div>
        </div>
      </div>

      <div className="h-16" />
    </OnboardingLayout>
  )
}
