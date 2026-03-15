import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { initSentry } from './lib/sentry'
import App from './App'
import './index.css'

// Initialize Sentry before anything else
initSentry()

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found — check index.html has <div id="root"></div>')
}

createRoot(rootElement).render(
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div className="min-h-screen flex items-center justify-center bg-surface-50 px-4">
          <div className="text-center max-w-md">
            <h1 className="text-xl font-semibold text-surface-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-surface-600 mb-4">
              An unexpected error occurred. Our team has been notified.
            </p>
            <button
              type="button"
              onClick={resetError}
              className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>,
)
