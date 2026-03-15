import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { Mic, Square, Play, Pause, RotateCcw } from 'lucide-react'
import OnboardingLayout from './OnboardingLayout'
import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { useApi } from '@/hooks/useApi'

const MIN_DURATION = 20
const MAX_DURATION = 180

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function StepVoice() {
  const navigate = useNavigate()
  const api = useApi()
  const { getToken } = useAuth()
  const recorder = useAudioRecorder()

  const [isPlaying, setIsPlaying] = useState(false)
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  // Auto-stop at max duration
  if (recorder.isRecording && recorder.duration >= MAX_DURATION) {
    recorder.stop()
  }

  const handlePlayPause = () => {
    if (!recorder.audioUrl) return

    if (isPlaying && audioEl) {
      audioEl.pause()
      setIsPlaying(false)
      return
    }

    const audio = new Audio(recorder.audioUrl)
    audio.onended = () => setIsPlaying(false)
    audio.play()
    setAudioEl(audio)
    setIsPlaying(true)
  }

  const handleNext = async () => {
    if (!recorder.audioBlob) return

    setUploading(true)
    setError('')

    try {
      const token = await getToken()
      const API_URL = import.meta.env.VITE_API_URL || ''

      // Upload blob directly to worker
      const uploadRes = await fetch(`${API_URL}/api/onboarding/voice-blob`, {
        method: 'PUT',
        body: recorder.audioBlob,
        headers: {
          'Content-Type': recorder.audioBlob.type,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!uploadRes.ok) throw new Error('Upload failed')
      const { key } = await uploadRes.json()

      // Confirm the recording
      await api.post('/api/onboarding/voice-confirm', {
        r2_key: key,
        duration_seconds: recorder.duration,
      })

      navigate('/onboarding/verify')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const hasRecording = recorder.audioBlob !== null
  const tooShort = hasRecording && recorder.duration < MIN_DURATION

  return (
    <OnboardingLayout
      step={5}
      totalSteps={7}
      title="Tell your agent how you work"
      subtitle="Just talk naturally for a minute or two. Your agent uses this to learn your style and tone."
      onNext={handleNext}
      onBack={() => navigate('/onboarding/pricing')}
      nextDisabled={!hasRecording || tooShort}
      loading={uploading}
      nextLabel={uploading ? 'Uploading...' : 'Continue'}
    >
      {(error || recorder.error) && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
          {error || recorder.error}
        </div>
      )}

      {/* Prompt suggestions */}
      <div className="rounded-xl border border-surface-200 bg-white p-4">
        <p className="text-sm font-medium text-surface-900 mb-2">Talk about things like:</p>
        <ul className="space-y-1.5 text-sm text-surface-700">
          <li>&ldquo;How do you usually handle a new enquiry?&rdquo;</li>
          <li>&ldquo;What do you say when someone asks about your availability?&rdquo;</li>
          <li>&ldquo;What makes you different from other electricians in your area?&rdquo;</li>
          <li>&ldquo;Anything customers should know before booking?&rdquo;</li>
        </ul>
      </div>

      {/* Recorder */}
      <div className="rounded-xl border border-surface-200 bg-white p-6">
        {/* Waveform / level indicator */}
        <div className="flex items-center justify-center h-20 mb-4">
          {recorder.isRecording ? (
            <div className="flex items-end gap-1 h-16">
              {Array.from({ length: 20 }).map((_, i) => {
                const height = Math.max(
                  4,
                  Math.random() * recorder.audioLevel * 64
                )
                return (
                  <div
                    key={i}
                    className="w-1.5 bg-brand-500 rounded-full transition-all duration-75"
                    style={{ height: `${height}px` }}
                  />
                )
              })}
            </div>
          ) : hasRecording ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePlayPause}
                className="w-12 h-12 rounded-full bg-brand-600 text-white flex items-center justify-center hover:bg-brand-700 transition-colors"
                aria-label={isPlaying ? 'Pause playback' : 'Play recording'}
              >
                {isPlaying ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </button>
              <div>
                <p className="text-sm font-medium text-surface-900">
                  Recording ready ({formatTime(recorder.duration)})
                </p>
                <p className="text-xs text-surface-700">
                  Tap play to review
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-surface-700">
                Tap the button to start recording
              </p>
              <p className="text-xs text-surface-700 mt-1">
                Minimum {MIN_DURATION} seconds, maximum {Math.floor(MAX_DURATION / 60)} minutes
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {recorder.isRecording ? (
            <>
              {/* Duration */}
              <span className="text-sm font-mono text-red-600 font-medium min-w-[3rem] text-center">
                {formatTime(recorder.duration)}
              </span>

              {/* Stop button */}
              <button
                type="button"
                onClick={recorder.stop}
                disabled={recorder.duration < MIN_DURATION}
                className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 disabled:opacity-50 transition-colors"
                aria-label="Stop recording"
              >
                <Square className="h-6 w-6" />
              </button>

              {/* Time remaining */}
              <span className="text-xs text-surface-700 min-w-[3rem] text-center">
                {recorder.duration < MIN_DURATION
                  ? `${MIN_DURATION - recorder.duration}s min`
                  : `${MAX_DURATION - recorder.duration}s left`}
              </span>
            </>
          ) : hasRecording ? (
            <>
              {/* Re-record */}
              <button
                type="button"
                onClick={recorder.reset}
                className="flex items-center gap-2 px-4 py-2 text-sm text-surface-700 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Re-record
              </button>
            </>
          ) : (
            /* Record button */
            <button
              type="button"
              onClick={recorder.start}
              className="w-16 h-16 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors shadow-lg"
              aria-label="Start recording"
            >
              <Mic className="h-7 w-7" />
            </button>
          )}
        </div>

        {tooShort && (
          <p className="text-center text-xs text-red-600 mt-3">
            Recording must be at least {MIN_DURATION} seconds
          </p>
        )}
      </div>

      <p className="text-xs text-surface-700 text-center">
        Your agent uses this to learn your style and tone &mdash; how you&rsquo;d actually talk to a customer, not how a robot would.
      </p>

      <div className="h-16" />
    </OnboardingLayout>
  )
}
