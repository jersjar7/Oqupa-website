/**
 * Whether a listing is boosted right now: `isBoosted` AND a `boostedUntil`
 * still in the future. Every screen asks this, never one field alone.
 *
 * Neither field is enough by itself (measured on production 2026-11-02):
 * - after a refund the listing has isBoosted false but boostedUntil still in
 *   the future;
 * - after a boost ends, isBoosted stays true until the hourly expiry job
 *   (expireStaleBoosts) clears it.
 *
 * `boostedUntil` may be a Date (mapped listings) or a raw Firestore Timestamp
 * (the agents' lead documents).
 */
export function isBoostLive(
  listing: { isBoosted?: boolean; boostedUntil?: unknown },
  now: number = Date.now(),
): boolean {
  if (listing.isBoosted !== true) return false
  const t = millisOf(listing.boostedUntil)
  return t !== null && t > now
}

function millisOf(value: unknown): number | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null
  if (value && typeof value === 'object') {
    const v = value as { toDate?: () => Date; toMillis?: () => number; seconds?: number }
    if (typeof v.toMillis === 'function') return v.toMillis()
    if (typeof v.toDate === 'function') return v.toDate().getTime()
    if (typeof v.seconds === 'number') return v.seconds * 1000
  }
  return null
}
