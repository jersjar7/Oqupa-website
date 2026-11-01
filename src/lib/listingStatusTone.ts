import type { ListingStatus } from '@/types/enums'
import type { PhotoOverlayTone } from '@/app/components/ui/PhotoOverlayBadge'

/**
 * The dot on a listing's status badge — shared spec with the app (brand audit
 * C5, 2026-10-31): green for Activo; neutral grey for Desactivado, Vendido and
 * Alquilado. Desactivado is a choice the owner made, not an error, so it never
 * gets a red dot.
 */
export const LISTING_STATUS_TONE: Record<ListingStatus, PhotoOverlayTone> = {
  draft: 'neutral',
  paymentPending: 'warning',
  active: 'success',
  expired: 'warning',
  deactivated: 'neutral',
  sold: 'neutral',
  rented: 'neutral',
}
