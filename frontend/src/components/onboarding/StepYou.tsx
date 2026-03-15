import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import OnboardingLayout from './OnboardingLayout'
import MapPreview from '../ui/MapPreview'
import { useApi } from '@/hooks/useApi'

interface PostcodeResult {
  postcode: string
  admin_district: string | null
  region: string | null
  latitude: number
  longitude: number
}

export default function StepYou() {
  const navigate = useNavigate()
  const api = useApi()

  const [firstName, setFirstName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [postcode, setPostcode] = useState('')
  const [postcodeData, setPostcodeData] = useState<PostcodeResult | null>(null)
  const [postcodeError, setPostcodeError] = useState('')
  const [postcodeLoading, setPostcodeLoading] = useState(false)
  const [radius, setRadius] = useState(15)
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Debounced postcode lookup
  useEffect(() => {
    const trimmed = postcode.replace(/\s/g, '')
    if (trimmed.length < 5) {
      setPostcodeData(null)
      setPostcodeError('')
      return
    }

    const timeout = setTimeout(async () => {
      setPostcodeLoading(true)
      setPostcodeError('')
      try {
        const res = await fetch(
          `https://api.postcodes.io/postcodes/${encodeURIComponent(trimmed)}`
        )
        const data = await res.json()
        if (data.status === 200 && data.result) {
          setPostcodeData({
            postcode: data.result.postcode,
            admin_district: data.result.admin_district,
            region: data.result.region,
            latitude: data.result.latitude,
            longitude: data.result.longitude,
          })
        } else {
          setPostcodeError('Postcode not found')
          setPostcodeData(null)
        }
      } catch {
        setPostcodeError('Could not look up postcode')
        setPostcodeData(null)
      } finally {
        setPostcodeLoading(false)
      }
    }, 500)

    return () => clearTimeout(timeout)
  }, [postcode])

  const isValid =
    firstName.trim().length >= 2 &&
    postcodeData !== null &&
    phone.trim().length >= 10

  const handleNext = async () => {
    if (!isValid || !postcodeData) return

    setSaving(true)
    setError('')

    try {
      await api.post('/api/onboarding/details', {
        first_name: firstName.trim(),
        business_name: businessName.trim() || null,
        postcode: postcodeData.postcode,
        lat: postcodeData.latitude,
        lng: postcodeData.longitude,
        service_radius_miles: radius,
        phone: phone.trim(),
      })
      navigate('/onboarding/services')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const areaName = postcodeData
    ? postcodeData.admin_district || postcodeData.region || 'your area'
    : null

  return (
    <OnboardingLayout
      step={2}
      totalSteps={7}
      title="Let's set up your agent"
      subtitle="First, the basics."
      onNext={handleNext}
      nextDisabled={!isValid}
      loading={saving}
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* First name */}
      <div>
        <label htmlFor="firstName" className="block text-sm font-medium text-surface-900 mb-1">
          First name <span className="text-red-500">*</span>
        </label>
        <input
          id="firstName"
          type="text"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Dave"
          maxLength={50}
          className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-surface-900 placeholder:text-surface-700/50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        <p className="text-xs text-surface-700 mt-1">
          Your agent will use this: &ldquo;{firstName || 'Dave'}&rsquo;s usually available...&rdquo;
        </p>
      </div>

      {/* Business name */}
      <div>
        <label htmlFor="businessName" className="block text-sm font-medium text-surface-900 mb-1">
          Business name <span className="text-surface-700 font-normal">(optional)</span>
        </label>
        <input
          id="businessName"
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Dave's Electrical"
          maxLength={100}
          className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-surface-900 placeholder:text-surface-700/50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Postcode */}
      <div>
        <label htmlFor="postcode" className="block text-sm font-medium text-surface-900 mb-1">
          Your postcode <span className="text-red-500">*</span>
        </label>
        <input
          id="postcode"
          type="text"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value.toUpperCase())}
          placeholder="TR1 3QW"
          maxLength={10}
          className={`w-full px-3 py-2.5 border rounded-lg text-surface-900 placeholder:text-surface-700/50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
            postcodeError ? 'border-red-300' : 'border-surface-200'
          }`}
        />
        {postcodeLoading && (
          <p className="text-xs text-surface-700 mt-1">Looking up postcode...</p>
        )}
        {postcodeError && (
          <p className="text-xs text-red-600 mt-1">{postcodeError}</p>
        )}
        {postcodeData && areaName && (
          <p className="text-xs text-brand-700 mt-1">
            {areaName} &mdash; {postcodeData.postcode}
          </p>
        )}
      </div>

      {/* Service radius */}
      <div>
        <label htmlFor="radius" className="block text-sm font-medium text-surface-900 mb-1">
          How far do you travel? <span className="font-semibold text-brand-700">{radius} miles</span>
        </label>
        <input
          id="radius"
          type="range"
          min={5}
          max={50}
          step={1}
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full accent-brand-600"
        />
        <div className="flex justify-between text-xs text-surface-700 mt-1">
          <span>5 miles</span>
          <span>50 miles</span>
        </div>
      </div>

      {/* Map preview */}
      {postcodeData && (
        <MapPreview
          areaName={areaName || 'Your area'}
          postcode={postcodeData.postcode}
          radiusMiles={radius}
        />
      )}

      {/* Phone number */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-surface-900 mb-1">
          Phone number <span className="text-red-500">*</span>
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07700 900456"
          maxLength={15}
          className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-surface-900 placeholder:text-surface-700/50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        <p className="text-xs text-surface-700 mt-1">
          Used for your agent&rsquo;s SMS channel. We&rsquo;ll verify it later.
        </p>
      </div>

      {/* Spacer for bottom bar */}
      <div className="h-16" />
    </OnboardingLayout>
  )
}
