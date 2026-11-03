import type { Listing } from '@/types/listing'
import { BOOST_TIER_LABELS } from '@/types/boost'
import DestacadoBadge from '@/app/components/ui/DestacadoBadge'
import { isBoostLive } from '@/lib/boostState'

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
  if (!isBoostLive(listing)) return null

  if (!detailed) {
    return <DestacadoBadge withStar className="shadow" />
  }

  // Detailed view for owners
  const tierLabel = listing.boostTier ? BOOST_TIER_LABELS[listing.boostTier] : ''
  const remainingDays = listing.boostedUntil
    ? Math.max(0, Math.ceil((listing.boostedUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  return (
    <div className="flex items-center gap-2">
      <DestacadoBadge withStar />
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
