import type { Listing } from '@/types/listing'
import { BOOST_TIER_LABELS } from '@/types/boost'

interface BoostStatusBadgeProps {
  listing: Listing
  /** Show detailed info (tier, remaining days) — for owner views */
  detailed?: boolean
}

/**
 * Displays boost status on a listing card.
 * - Simple "Destacado" badge for public views (already exists in explore cards)
 * - Detailed badge with tier and remaining days for owner views
 */
export default function BoostStatusBadge({ listing, detailed = false }: BoostStatusBadgeProps) {
  if (!listing.isBoosted) return null

  if (!detailed) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white shadow">
        <StarIcon />
        Destacado
      </span>
    )
  }

  // Detailed view for owners
  const tierLabel = listing.boostTier ? BOOST_TIER_LABELS[listing.boostTier] : ''
  const remainingDays = listing.boostedUntil
    ? Math.max(0, Math.ceil((listing.boostedUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-1 text-xs font-semibold text-amber-600 ring-1 ring-amber-500/30">
        <StarIcon />
        Destacado
      </span>
      {tierLabel && (
        <span className="text-xs text-text-secondary">
          {tierLabel}
        </span>
      )}
      {remainingDays > 0 && (
        <span className="text-xs text-text-tertiary">
          · {remainingDays} día{remainingDays !== 1 ? 's' : ''} restante{remainingDays !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  )
}

function StarIcon() {
  return (
    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  )
}
