import { Zap } from 'lucide-react'

interface OnboardingLayoutProps {
  step: number
  totalSteps: number
  title: string
  subtitle?: string
  children: React.ReactNode
  onNext?: () => void
  onBack?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  loading?: boolean
}

const STEP_LABELS = ['Sign up', 'You', 'Services', 'Pricing', 'Voice', 'Verify', 'Go live']

export default function OnboardingLayout({
  step,
  totalSteps,
  title,
  subtitle,
  children,
  onNext,
  onBack,
  nextLabel = 'Continue',
  nextDisabled = false,
  loading = false,
}: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white border-b border-surface-200">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-brand-600" />
          <span className="font-semibold text-surface-900">TradGo</span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="max-w-lg mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-surface-700">
            Step {step} of {totalSteps}
          </span>
          <span className="text-xs text-surface-700">
            {STEP_LABELS[step - 1] || ''}
          </span>
        </div>
        <div className="w-full h-2 bg-surface-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand-600 rounded-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold text-surface-900 mb-1">{title}</h1>
        {subtitle && (
          <p className="text-sm text-surface-700 mb-6">{subtitle}</p>
        )}

        <div className="space-y-5">{children}</div>
      </main>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-surface-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 text-sm font-medium text-surface-700 hover:text-surface-900 transition-colors"
            >
              Back
            </button>
          )}
          {onNext && (
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled || loading}
              className="flex-1 py-2.5 px-4 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : nextLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
