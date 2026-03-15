import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap,
  ShieldCheck,
  Search,
  Lightbulb,
  AlertTriangle,
  Car,
  Flame,
  Smartphone,
  Building,
} from 'lucide-react'
import OnboardingLayout from './OnboardingLayout'
import { useApi } from '@/hooks/useApi'

interface ServiceCategory {
  id: string
  label: string
  icon: React.ReactNode
}

const SERVICES: ServiceCategory[] = [
  { id: 'rewires', label: 'Rewires', icon: <Zap className="h-5 w-5" /> },
  { id: 'consumer_units', label: 'Consumer units', icon: <ShieldCheck className="h-5 w-5" /> },
  { id: 'testing', label: 'Testing & inspection', icon: <Search className="h-5 w-5" /> },
  { id: 'sockets_lighting', label: 'Sockets & lighting', icon: <Lightbulb className="h-5 w-5" /> },
  { id: 'fault_finding', label: 'Fault finding', icon: <AlertTriangle className="h-5 w-5" /> },
  { id: 'ev_charger', label: 'EV charger', icon: <Car className="h-5 w-5" /> },
  { id: 'fire_security', label: 'Fire & security', icon: <Flame className="h-5 w-5" /> },
  { id: 'smart_home', label: 'Smart home', icon: <Smartphone className="h-5 w-5" /> },
  { id: 'commercial', label: 'Commercial', icon: <Building className="h-5 w-5" /> },
]

export default function StepServices() {
  const navigate = useNavigate()
  const api = useApi()

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [otherText, setOtherText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleService = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const isValid = selected.size > 0 || otherText.trim().length > 0

  const handleNext = async () => {
    if (!isValid) return

    setSaving(true)
    setError('')

    try {
      const categories = [...selected]
      if (otherText.trim()) {
        categories.push(`other:${otherText.trim()}`)
      }

      await api.post('/api/onboarding/services', { categories })
      navigate('/onboarding/pricing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <OnboardingLayout
      step={3}
      totalSteps={7}
      title="Tick the jobs you take on"
      subtitle="Your agent will discuss these with customers. Pick at least one."
      onNext={handleNext}
      onBack={() => navigate('/onboarding/you')}
      nextDisabled={!isValid}
      loading={saving}
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* Service grid */}
      <div className="grid grid-cols-2 gap-3">
        {SERVICES.map((service) => {
          const isSelected = selected.has(service.id)
          return (
            <button
              key={service.id}
              type="button"
              onClick={() => toggleService(service.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${
                isSelected
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-surface-200 bg-white text-surface-700 hover:border-surface-200/80'
              }`}
              aria-pressed={isSelected}
            >
              <div
                className={`p-2 rounded-lg ${
                  isSelected ? 'bg-brand-100' : 'bg-surface-100'
                }`}
              >
                {service.icon}
              </div>
              <span className="text-sm font-medium leading-tight">
                {service.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Other */}
      <div>
        <label htmlFor="other" className="block text-sm font-medium text-surface-900 mb-1">
          Other services
        </label>
        <input
          id="other"
          type="text"
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          placeholder="Anything else you offer?"
          maxLength={200}
          className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-surface-900 placeholder:text-surface-700/50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Selected count */}
      {selected.size > 0 && (
        <p className="text-sm text-brand-700 font-medium">
          {selected.size} service{selected.size !== 1 ? 's' : ''} selected
        </p>
      )}

      {/* Spacer for bottom bar */}
      <div className="h-16" />
    </OnboardingLayout>
  )
}
