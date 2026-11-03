import type { Listing } from '@/types/listing'

/**
 * Whether a listing is boosted right now: `isBoosted` AND a `boostedUntil`
 * still in the future. Every screen asks this, never one field alone.
 *
 * Neither field is enough by itself (measured on production 2026-11-02):
 * - after a refund the listing has isBoosted false but boostedUntil still in
 *   the future;
 * - after a boost ends, isBoosted stays true until the hourly expiry job
 *   (expireStaleBoosts) clears it.
 */
export function isBoostLive(
  listing: Pick<Listing, 'isBoosted' | 'boostedUntil'>,
  now: number = Date.now(),
): boolean {
  if (listing.isBoosted !== true) return false
  const until = listing.boostedUntil
  if (!(until instanceof Date)) return false
  const t = until.getTime()
  return Number.isFinite(t) && t > now
}
