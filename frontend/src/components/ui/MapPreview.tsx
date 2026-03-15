import { MapPin } from 'lucide-react'

interface MapPreviewProps {
  areaName: string
  postcode: string
  radiusMiles: number
}

/**
 * Visual coverage area preview.
 * Shows a stylised circle with area name and radius.
 * Uses OpenStreetMap static tile as background for visual context.
 */
export default function MapPreview({
  areaName,
  postcode,
  radiusMiles,
}: MapPreviewProps) {
  return (
    <div className="rounded-xl border border-surface-200 bg-white overflow-hidden">
      {/* Visual circle representation */}
      <div className="relative bg-brand-50 flex items-center justify-center py-8">
        {/* Outer ring */}
        <div className="relative w-40 h-40 rounded-full border-2 border-dashed border-brand-300 flex items-center justify-center">
          {/* Inner dot */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center shadow-md">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs font-medium text-brand-700 mt-1">
              {postcode}
            </span>
          </div>

          {/* Radius label */}
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full">
            <div className="flex items-center gap-1">
              <div className="w-6 border-t border-brand-400" />
              <span className="text-xs font-medium text-brand-700 whitespace-nowrap">
                {radiusMiles} mi
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="px-4 py-3 border-t border-surface-200">
        <p className="text-sm font-medium text-surface-900">
          {areaName} &amp; surrounding areas
        </p>
        <p className="text-xs text-surface-700">
          {radiusMiles}-mile coverage radius from {postcode}
        </p>
      </div>
    </div>
  )
}
