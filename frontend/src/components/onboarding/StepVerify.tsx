import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Upload, FileText, CheckCircle, Clock } from 'lucide-react'
import { useAuth } from '@clerk/clerk-react'
import OnboardingLayout from './OnboardingLayout'
import { useApi } from '@/hooks/useApi'

const SCHEMES = [
  { value: 'niceic', label: 'NICEIC' },
  { value: 'napit', label: 'NAPIT' },
  { value: 'elecsa', label: 'ELECSA' },
  { value: 'eca', label: 'ECA' },
  { value: 'ozev', label: 'OZEV' },
]

export default function StepVerify() {
  const navigate = useNavigate()
  const api = useApi()
  const { getToken } = useAuth()

  const [scheme, setScheme] = useState('')
  const [regNumber, setRegNumber] = useState('')
  const [regSubmitted, setRegSubmitted] = useState(false)
  const [regLoading, setRegLoading] = useState(false)

  const [insuranceFile, setInsuranceFile] = useState<File | null>(null)
  const [insuranceUploaded, setInsuranceUploaded] = useState(false)
  const [insuranceLoading, setInsuranceLoading] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleRegSubmit = async () => {
    if (!scheme || !regNumber.trim()) return
    setRegLoading(true)
    setError('')

    try {
      await api.post('/api/onboarding/verification', {
        type: 'registration',
        scheme,
        reference_number: regNumber.trim(),
      })
      setRegSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setRegLoading(false)
    }
  }

  const handleInsuranceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file
    const maxSize = 5 * 1024 * 1024
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']

    if (file.size > maxSize) {
      setError('File must be under 5MB')
      return
    }
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF, JPG, or PNG')
      return
    }

    setInsuranceFile(file)
    setInsuranceLoading(true)
    setError('')

    try {
      const token = await getToken()
      const API_URL = import.meta.env.VITE_API_URL || ''

      // Upload file directly to worker
      const uploadRes = await fetch(`${API_URL}/api/onboarding/insurance-upload`, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!uploadRes.ok) throw new Error('Upload failed')
      const { key } = await uploadRes.json()

      // Save verification record
      await api.post('/api/onboarding/verification', {
        type: 'insurance',
        document_r2_key: key,
      })

      setInsuranceUploaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setInsuranceFile(null)
    } finally {
      setInsuranceLoading(false)
    }
  }

  const handleNext = async () => {
    setSaving(true)
    try {
      await api.post('/api/onboarding/verify-complete', {})
      navigate('/onboarding/go-live')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => {
    navigate('/onboarding/go-live')
  }

  return (
    <OnboardingLayout
      step={6}
      totalSteps={7}
      title="Let your agent prove you're the real deal"
      subtitle="Verified agents get more trust from customers. You can skip and add these later."
      onNext={handleNext}
      onBack={() => navigate('/onboarding/voice')}
      nextLabel="Continue"
      loading={saving}
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
      )}

      {/* Registration body */}
      <div className="rounded-xl border border-surface-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-600" />
          <h3 className="text-sm font-semibold text-surface-900">Registration body</h3>
        </div>

        {regSubmitted ? (
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
            <Clock className="h-4 w-4 text-amber-600" />
            <p className="text-sm text-amber-800">
              Verification pending — {SCHEMES.find((s) => s.value === scheme)?.label} #{regNumber}
            </p>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="scheme" className="block text-xs text-surface-700 mb-1">
                Registration scheme
              </label>
              <select
                id="scheme"
                value={scheme}
                onChange={(e) => setScheme(e.target.value)}
                className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm text-surface-900 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Select scheme...</option>
                {SCHEMES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="regNumber" className="block text-xs text-surface-700 mb-1">
                Registration number
              </label>
              <input
                id="regNumber"
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="e.g. 12345"
                maxLength={50}
                className="w-full px-3 py-2.5 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <button
              type="button"
              onClick={handleRegSubmit}
              disabled={!scheme || !regNumber.trim() || regLoading}
              className="w-full py-2 px-4 bg-surface-900 text-white text-sm font-medium rounded-lg hover:bg-surface-800 disabled:opacity-50 transition-colors"
            >
              {regLoading ? 'Checking...' : 'Submit for verification'}
            </button>
          </>
        )}
      </div>

      {/* Insurance */}
      <div className="rounded-xl border border-surface-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-brand-600" />
          <h3 className="text-sm font-semibold text-surface-900">Insurance certificate</h3>
        </div>

        {insuranceUploaded ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <p className="text-sm text-green-800">
              Insurance uploaded — verification in progress
            </p>
          </div>
        ) : (
          <label
            className={`flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              insuranceLoading
                ? 'border-surface-200 opacity-60 pointer-events-none'
                : 'border-surface-200 hover:border-brand-400'
            }`}
          >
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleInsuranceUpload}
              className="hidden"
              disabled={insuranceLoading}
            />
            <Upload className="h-6 w-6 text-surface-700" />
            <p className="text-sm text-surface-700">
              {insuranceLoading
                ? 'Uploading...'
                : insuranceFile
                  ? insuranceFile.name
                  : 'Upload PDF, JPG, or PNG (max 5MB)'}
            </p>
          </label>
        )}
      </div>

      {/* Skip */}
      <button
        type="button"
        onClick={handleSkip}
        className="w-full text-center text-sm text-surface-700 hover:text-surface-900 py-2"
      >
        I&rsquo;ll do this later
      </button>

      <div className="h-16" />
    </OnboardingLayout>
  )
}
