import { useState } from 'react'
import { Zap, ShieldCheck, X } from 'lucide-react'
import type { AgentProfile } from './AgentPage'

// Map service categories to readable labels
const SERVICE_LABELS: Record<string, string> = {
  rewires: 'Rewires',
  consumer_units: 'Consumer units',
  testing: 'Testing & inspection',
  sockets_lighting: 'Sockets & lighting',
  fault_finding: 'Fault finding',
  ev_charger: 'EV chargers',
  fire_security: 'Fire & security',
  smart_home: 'Smart home',
  commercial: 'Commercial',
}

interface ProfileHeaderProps {
  profile: AgentProfile
}

export default function ProfileHeader({ profile }: ProfileHeaderProps) {
  const [badgeDetail, setBadgeDetail] = useState<typeof profile.badges[0] | null>(null)

  const displayName = profile.business_name || `${profile.first_name}'s Electrical`
  const verifiedBadges = profile.badges

  return (
    <>
      <div className="bg-surface-50 border-b border-surface-200 px-4 py-5">
        <div className="max-w-lg mx-auto">
          {/* Name + area */}
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-5 w-5 text-brand-600 shrink-0" />
            <h1 className="text-lg font-bold text-surface-900 truncate">{displayName}</h1>
          </div>
          {profile.area && (
            <p className="text-sm text-surface-600 ml-7">{profile.area} & surrounding areas</p>
          )}

          {/* Verification badges */}
          {verifiedBadges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 ml-7">
              {verifiedBadges.map((badge, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setBadgeDetail(badge)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 bg-brand-50 px-2 py-1 rounded-full hover:bg-brand-100 transition-colors"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {badge.type === 'registration'
                    ? `${badge.scheme || 'Registered'} Registered`
                    : 'Insured'}
                </button>
              ))}
            </div>
          )}

          {/* Services */}
          {profile.services.length > 0 && (
            <div className="mt-3 ml-7">
              <p className="text-xs text-surface-500">
                {profile.services
                  .slice(0, 6)
                  .map((s) => SERVICE_LABELS[s] || s.replace(/_/g, ' '))
                  .join(' · ')}
                {profile.services.length > 6 && ` · +${profile.services.length - 6} more`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Badge detail popover */}
      {badgeDetail && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30"
          onClick={() => setBadgeDetail(null)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-md mx-4 mb-0 sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-600" />
                <h3 className="font-semibold text-surface-900">
                  {badgeDetail.type === 'registration'
                    ? `${badgeDetail.scheme || ''} Registered`
                    : 'Insured'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBadgeDetail(null)}
                className="p-1 text-surface-400 hover:text-surface-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {badgeDetail.type === 'registration' && (
              <div className="space-y-2 text-sm">
                {badgeDetail.reference_number && (
                  <div className="flex justify-between">
                    <span className="text-surface-500">Registration</span>
                    <span className="text-surface-900 font-medium">#{badgeDetail.reference_number}</span>
                  </div>
                )}
                {badgeDetail.detail && (
                  <>
                    {(badgeDetail.detail as Record<string, string>).scope && (
                      <div className="flex justify-between">
                        <span className="text-surface-500">Scope</span>
                        <span className="text-surface-900">{(badgeDetail.detail as Record<string, string>).scope}</span>
                      </div>
                    )}
                    {(badgeDetail.detail as Record<string, string>).status && (
                      <div className="flex justify-between">
                        <span className="text-surface-500">Status</span>
                        <span className="text-brand-600 font-medium">{(badgeDetail.detail as Record<string, string>).status}</span>
                      </div>
                    )}
                  </>
                )}
                <p className="text-xs text-surface-400 pt-2 border-t border-surface-100">
                  Verified by TradGo against the {badgeDetail.scheme} public register.
                </p>
              </div>
            )}

            {badgeDetail.type === 'insurance' && (
              <div className="space-y-2 text-sm">
                <p className="text-surface-700">
                  {profile.first_name} holds valid public liability insurance.
                </p>
                <p className="text-xs text-surface-400 pt-2 border-t border-surface-100">
                  Insurance documentation verified by TradGo.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
