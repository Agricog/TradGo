import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PoundSterling } from 'lucide-react'
import OnboardingLayout from './OnboardingLayout'
import { useApi } from '@/hooks/useApi'

interface ServicePrice {
  category: string
  label: string
  price_from: string
  price_to: string
  day_rate: string
  pricing_note: string
  usesDayRate: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  rewires: 'Rewires',
  consumer_units: 'Consumer units',
  testing: 'Testing & inspection',
  sockets_lighting: 'Sockets & lighting',
  fault_finding: 'Fault finding',
  ev_charger: 'EV charger',
  fire_security: 'Fire & security',
  smart_home: 'Smart home',
  commercial: 'Commercial',
}

const PLACEHOLDER_PRICES: Record<string, { from: string; to: string }> = {
  rewires: { from: '2500', to: '4500' },
  consumer_units: { from: '850', to: '1200' },
  testing: { from: '150', to: '350' },
  sockets_lighting: { from: '80', to: '250' },
  fault_finding: { from: '120', to: '250' },
  ev_charger: { from: '800', to: '1500' },
  fire_security: { from: '200', to: '500' },
  smart_home: { from: '150', to: '400' },
  commercial: { from: '350', to: '500' },
}

export default function StepPricing() {
  const navigate = useNavigate()
  const api = useApi()

  const [services, setServices] = useState<ServicePrice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load services from previous step
  useEffect(() => {
    let cancelled = false
    async function loadServices() {
      try {
        const data = await api.get<{ services: { category: string }[] }>('/api/onboarding/services')
        if (cancelled) return

        const prices: ServicePrice[] = data.services.map((s) => {
          const isOther = s.category.startsWith('other:')
          return {
            category: s.category,
            label: isOther ? s.category.replace('other:', '') : (CATEGORY_LABELS[s.category] || s.category),
            price_from: '',
            price_to: '',
            day_rate: '',
            pricing_note: '',
            usesDayRate: false,
          }
        })

        setServices(prices)
      } catch (err) {
        setError('Failed to load services')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadServices()
    return () => { cancelled = true }
  }, [])

  const updateService = (index: number, field: keyof ServicePrice, value: string | boolean) => {
    setServices((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleNext = async () => {
    setSaving(true)
    setError('')

    try {
      const pricing = services.map((s) => ({
        category: s.category,
        price_from: s.usesDayRate ? null : (s.price_from ? parseFloat(s.price_from) : null),
        price_to: s.usesDayRate ? null : (s.price_to ? parseFloat(s.price_to) : null),
        day_rate: s.usesDayRate ? (s.day_rate ? parseFloat(s.day_rate) : null) : null,
        pricing_note: s.pricing_note || null,
      }))

      await api.post('/api/onboarding/pricing', { pricing })
      navigate('/onboarding/voice')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    setSaving(true)
    try {
      await api.post('/api/onboarding/pricing', { pricing: [] })
      navigate('/onboarding/voice')
    } catch {
      navigate('/onboarding/voice')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <OnboardingLayout step={4} totalSteps={7} title="Loading...">
        <div className="py-12 text-center text-surface-700 text-sm">Loading your services...</div>
      </OnboardingLayout>
    )
  }

  return (
    <OnboardingLayout
      step={4}
      totalSteps={7}
      title="Give your agent a rough idea of your prices"
      subtitle="These are rough guides, not binding quotes. Your agent will always say 'estimate subject to site visit.'"
      onNext={handleNext}
      onBack={() => navigate('/onboarding/services')}
      loading={saving}
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
      )}

      {services.map((service, index) => (
        <div key={service.category} className="rounded-xl border border-surface-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-900">{service.label}</h3>
            <button
              type="button"
              onClick={() => updateService(index, 'usesDayRate', !service.usesDayRate)}
              className="text-xs text-brand-600 font-medium"
            >
              {service.usesDayRate ? 'Use price range' : 'Use day rate'}
            </button>
          </div>

          {service.usesDayRate ? (
            <div>
              <label className="block text-xs text-surface-700 mb-1">Day rate (£)</label>
              <div className="relative">
                <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-700" />
                <input
                  type="number"
                  value={service.day_rate}
                  onChange={(e) => updateService(index, 'day_rate', e.target.value)}
                  placeholder={PLACEHOLDER_PRICES[service.category]?.from || '350'}
                  className="w-full pl-9 pr-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-surface-700 mb-1">From (£)</label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-700" />
                  <input
                    type="number"
                    value={service.price_from}
                    onChange={(e) => updateService(index, 'price_from', e.target.value)}
                    placeholder={PLACEHOLDER_PRICES[service.category]?.from || ''}
                    className="w-full pl-9 pr-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-surface-700 mb-1">To (£)</label>
                <div className="relative">
                  <PoundSterling className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-700" />
                  <input
                    type="number"
                    value={service.price_to}
                    onChange={(e) => updateService(index, 'price_to', e.target.value)}
                    placeholder={PLACEHOLDER_PRICES[service.category]?.to || ''}
                    className="w-full pl-9 pr-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-surface-700 mb-1">Note (optional)</label>
            <input
              type="text"
              value={service.pricing_note}
              onChange={(e) => updateService(index, 'pricing_note', e.target.value)}
              placeholder="e.g. Depends on number of circuits"
              maxLength={200}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      ))}

      {/* Skip option */}
      <button
        type="button"
        onClick={handleSkip}
        className="w-full text-center text-sm text-surface-700 hover:text-surface-900 py-2"
      >
        I&rsquo;ll add prices later
      </button>

      <div className="h-16" />
    </OnboardingLayout>
  )
}
