import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Zap } from 'lucide-react'
import ProfileHeader from './ProfileHeader'
import ContactCapture from './ContactCapture'

const AGENT_API = import.meta.env.VITE_AGENT_PUBLIC_API_URL || ''

export interface AgentProfile {
  slug: string
  first_name: string
  business_name: string | null
  area: string | null
  phone: string | null
  is_live: boolean
  services: string[]
  badges: {
    type: string
    scheme: string | null
    reference_number: string | null
    detail: Record<string, unknown> | null
  }[]
}

export default function AgentPage() {
  const { slug } = useParams<{ slug: string }>()
  const [profile, setProfile] = useState<AgentProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    let cancelled = false

    async function loadProfile() {
      try {
        const res = await fetch(`${AGENT_API}/api/agent-public/${slug}/profile`)
        if (!res.ok) {
          if (!cancelled) setNotFound(true)
          return
        }
        const data = await res.json()
        if (!cancelled) setProfile(data)
      } catch {
        if (!cancelled) setNotFound(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadProfile()
    return () => { cancelled = true }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Zap className="h-6 w-6 text-brand-600 animate-pulse" />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <p className="text-surface-900 font-semibold text-lg mb-2">This agent page doesn't exist.</p>
        <p className="text-surface-500 text-sm text-center max-w-xs">
          The link might be wrong, or the electrician may have changed their page.
        </p>
      </div>
    )
  }

  // Agent is paused/offline
  if (!profile.is_live) {
    return (
      <div className="min-h-screen bg-white">
        <ProfileHeader profile={profile} />
        <div className="px-4 py-12 text-center">
          <p className="text-surface-900 font-medium mb-2">
            {profile.first_name}'s agent is currently offline.
          </p>
          {profile.phone && (
            <>
              <p className="text-surface-500 text-sm mb-4">
                You can reach {profile.first_name} directly:
              </p>
              <a
                href={`tel:${profile.phone}`}
                className="inline-flex items-center gap-2 bg-brand-600 text-white font-medium px-6 py-3 rounded-lg hover:bg-brand-700 transition-colors"
              >
                Call {profile.first_name}
              </a>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Zone 1: Profile header */}
      <ProfileHeader profile={profile} />

      {/* Zone 2: Conversation area — placeholder for Batch 17 */}
      <div className="flex-1 px-4 py-6">
        <div className="max-w-lg mx-auto">
          {/* Agent opening message */}
          <div className="flex justify-start mb-4">
            <div className="bg-brand-600 text-white rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
              <p className="text-sm leading-relaxed">
                Hi! I'm {profile.first_name}'s agent. I handle enquiries and quotes so{' '}
                {profile.first_name} can focus on the job.
              </p>
              <p className="text-sm leading-relaxed mt-2">What can I help with?</p>
            </div>
          </div>
        </div>
      </div>

      {/* Zone 3: Contact capture / input */}
      <div className="sticky bottom-0 bg-white border-t border-surface-200">
        <div className="max-w-lg mx-auto px-4 py-4">
          <ContactCapture profile={profile} />
        </div>
        <p className="text-center text-[11px] text-surface-400 pb-3 px-4">
          Your name and contact details are shared with {profile.first_name} to handle your enquiry.
        </p>
      </div>
    </div>
  )
}
