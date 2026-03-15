import { useState, useEffect } from 'react'
import { WifiOff } from 'lucide-react'

/**
 * Shows a banner when the browser loses internet connection.
 * Hides automatically when connection returns.
 */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const handleOffline = () => setOffline(true)
    const handleOnline = () => setOffline(false)

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-3">
      <WifiOff className="h-4 w-4 text-amber-600 shrink-0" />
      <p className="text-sm text-amber-800">
        You're offline — actions will sync when you're back online.
      </p>
    </div>
  )
}
