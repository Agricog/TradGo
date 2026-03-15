import { useState, useEffect } from 'react'
import { useUser, useClerk } from '@clerk/clerk-react'
import { ExternalLink, LogOut } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { requestPushPermission, isPushEnabled } from '@/lib/notifications'
import { useAuth } from '@clerk/clerk-react'

interface ChannelStatus {
  sms: { active: boolean; number: string | null }
  whatsapp: { active: boolean; status: string }
  web: { active: boolean }
}

interface BillingInfo {
  plan: string
  status: string
  trial_ends_at: string | null
  has_billing_account: boolean
}

interface NotifPrefs {
  push_enabled: boolean
  digest_email_enabled: boolean
  notification_sound: boolean
}

export default function SettingsView() {
  const api = useApi()
  const { user } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useAuth()

  const [channels, setChannels] = useState<ChannelStatus | null>(null)
  const [billing, setBilling] = useState<BillingInfo | null>(null)
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs | null>(null)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushActive, setPushActive] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    loadSettings()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSettings() {
    try {
      const [channelsRes, billingRes, notifRes] = await Promise.all([
        api.get<ChannelStatus>('/api/settings/channels').catch(() => null),
        api.get<BillingInfo>('/api/billing/status').catch(() => null),
        api.get<NotifPrefs>('/api/settings/notifications').catch(() => null),
      ])
      if (channelsRes) setChannels(channelsRes)
      if (billingRes) setBilling(billingRes)
      if (notifRes) setNotifPrefs(notifRes)

      const supported = 'serviceWorker' in navigator && 'PushManager' in window
      setPushSupported(supported)
      if (supported) {
        const active = await isPushEnabled()
        setPushActive(active)
      }
    } catch { /* no-op */ }
  }

  const handleSubscribe = async (plan: string) => {
    setSubscribing(true)
    try {
      const data = await api.post<{ url: string }>('/api/billing/create-checkout', { plan })
      window.location.href = data.url
    } catch {
      setSubscribing(false)
    }
  }

  const handleManageBilling = async () => {
    setPortalLoading(true)
    try {
      const data = await api.post<{ url: string }>('/api/billing/portal', {})
      window.location.href = data.url
    } catch {
      setPortalLoading(false)
    }
  }

  const handleTogglePush = async () => {
    if (!pushActive) {
      const ok = await requestPushPermission(getToken)
      setPushActive(ok)
      if (ok) {
        await api.put('/api/settings/notifications', { push_enabled: true })
        setNotifPrefs((prev) => prev ? { ...prev, push_enabled: true } : prev)
      }
    } else {
      await api.put('/api/settings/notifications', { push_enabled: false })
      setNotifPrefs((prev) => prev ? { ...prev, push_enabled: false } : prev)
      setPushActive(false)
    }
  }

  const handleToggleDigest = async () => {
    if (!notifPrefs) return
    const next = !notifPrefs.digest_email_enabled
    await api.put('/api/settings/notifications', { digest_email_enabled: next })
    setNotifPrefs({ ...notifPrefs, digest_email_enabled: next })
  }

  const handleToggleSound = async () => {
    if (!notifPrefs) return
    const next = !notifPrefs.notification_sound
    await api.put('/api/settings/notifications', { notification_sound: next })
    setNotifPrefs({ ...notifPrefs, notification_sound: next })
  }

  // Calculate trial days
  let trialDaysLeft: number | null = null
  if (billing?.trial_ends_at) {
    const now = new Date()
    const trialEnd = new Date(billing.trial_ends_at)
    trialDaysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }

  return (
    <div className="space-y-6">
      {/* ========== Account ========== */}
      <Section title="Account">
        <InfoRow label="Email" value={user?.primaryEmailAddress?.emailAddress || '—'} />
        <InfoRow label="Account" value="Managed by Clerk" />
        <button
          type="button"
          onClick={() => signOut()}
          className="flex items-center gap-2 text-sm text-red-600 font-medium mt-3 hover:text-red-700"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </Section>

      {/* ========== Billing ========== */}
      <Section title="Billing">
        {billing ? (
          <div className="space-y-3">
            <InfoRow label="Plan" value={billing.plan} />
            <InfoRow label="Status" value={billing.status === 'active' ? 'Active' : billing.status === 'trialing' ? 'Trial' : billing.status === 'past_due' ? 'Past due' : billing.status === 'expired' ? 'Expired' : billing.status} />

            {trialDaysLeft !== null && trialDaysLeft > 0 && (
              <InfoRow label="Trial ends" value={`${trialDaysLeft} ${trialDaysLeft === 1 ? 'day' : 'days'} remaining`} />
            )}

            {billing.has_billing_account ? (
              <button
                type="button"
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="inline-flex items-center gap-1 text-sm text-brand-600 font-medium hover:text-brand-700 mt-1"
              >
                {portalLoading ? 'Loading...' : 'Manage billing'} <ExternalLink className="h-3.5 w-3.5" />
              </button>
            ) : (
              <div className="space-y-2 pt-2">
                <p className="text-xs text-surface-500">Choose a plan to keep your agent running:</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSubscribe('solo')}
                    disabled={subscribing}
                    className="bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    {subscribing ? 'Loading...' : 'Solo — £149/mo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubscribe('growth')}
                    disabled={subscribing}
                    className="bg-white text-surface-700 text-sm font-medium px-4 py-2 rounded-lg border border-surface-200 hover:bg-surface-50 disabled:opacity-50 transition-colors"
                  >
                    Growth — £199/mo
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <InfoRow label="Plan" value="Loading..." />
          </div>
        )}
      </Section>

      {/* ========== Channels ========== */}
      <Section title="Channels">
        {channels ? (
          <div className="space-y-2">
            <ChannelRow label="SMS" active={channels.sms.active} detail={channels.sms.number || 'Not provisioned'} />
            <ChannelRow label="WhatsApp" active={channels.whatsapp.active} detail={channels.whatsapp.active ? 'Active' : channels.whatsapp.status || 'Pending Meta approval'} />
            <ChannelRow label="Web chat" active={channels.web.active} detail="Active" />
          </div>
        ) : (
          <p className="text-sm text-surface-500">Loading channels...</p>
        )}
      </Section>

      {/* ========== Notifications ========== */}
      <Section title="Notifications">
        <div className="space-y-3">
          {pushSupported && (
            <Toggle label="Push notifications" checked={pushActive} onChange={handleTogglePush} />
          )}
          <Toggle label="Daily digest email" checked={notifPrefs?.digest_email_enabled ?? true} onChange={handleToggleDigest} />
          <Toggle label="Notification sound" checked={notifPrefs?.notification_sound ?? true} onChange={handleToggleSound} />
        </div>
      </Section>

      {/* ========== Data & Privacy ========== */}
      <Section title="Data & Privacy">
        <p className="text-xs text-surface-500 mb-3">
          Your data is encrypted and stored securely. Conversations auto-archive after 90 days.
        </p>
        <button
          type="button"
          onClick={() => api.post('/api/settings/export', {}).catch(() => {})}
          className="text-sm text-brand-600 font-medium hover:text-brand-700"
        >
          Download my data
        </button>
      </Section>

      {/* ========== Help ========== */}
      <Section title="Help">
        <a href="mailto:support@tradgo.co.uk" className="text-sm text-brand-600 font-medium hover:text-brand-700">
          Contact support
        </a>
      </Section>

      <div className="h-4" />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-surface-200 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-surface-900 mb-3">{title}</h3>
      {children}
    </section>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-surface-500">{label}</span>
      <span className="text-sm text-surface-900">{value}</span>
    </div>
  )
}

function ChannelRow({ label, active, detail }: { label: string; active: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${active ? 'bg-brand-500' : 'bg-amber-400'}`} />
        <span className="text-sm text-surface-900">{label}</span>
      </div>
      <span className="text-xs text-surface-500">{detail}</span>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-surface-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${checked ? 'bg-brand-600' : 'bg-surface-300'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}
