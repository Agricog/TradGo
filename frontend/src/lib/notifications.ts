const API_URL = import.meta.env.VITE_API_URL || ''

/**
 * Request push notification permission and register the subscription
 * with the backend. Returns true if permission was granted.
 */
export async function requestPushPermission(getToken: () => Promise<string | null>): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported in this browser')
    return false
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    const registration = await navigator.serviceWorker.ready

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      // Get VAPID public key from server
      const token = await getToken()
      const keyResponse = await fetch(`${API_URL}/api/notifications/vapid-key`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!keyResponse.ok) return false

      const { publicKey } = await keyResponse.json()

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })
    }

    // Send subscription to backend
    const token = await getToken()
    const response = await fetch(`${API_URL}/api/notifications/push-subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    })

    return response.ok
  } catch (err) {
    console.error('Push notification setup failed:', err)
    return false
  }
}

/**
 * Check if push notifications are currently enabled.
 */
export async function isPushEnabled(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false

  try {
    const permission = Notification.permission
    if (permission !== 'granted') return false

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    return subscription !== null
  } catch {
    return false
  }
}

/**
 * Unsubscribe from push notifications.
 */
export async function unsubscribePush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
    }
    return true
  } catch {
    return false
  }
}

// Convert VAPID key from base64 string to Uint8Array
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
