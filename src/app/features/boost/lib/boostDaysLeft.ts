// Whole days of boost left, as the owner reads them. Same rule as the app's
// chip (Listing.boostDaysRemaining in the Flutter app):
// - partial days round UP, never below 0 (just after buying 30 days: 30);
// - up to an hour over the tier's days counts as the tier's days, so a browser
//   clock slightly behind the server never makes a fresh boost read 31;
// - a boost bought on top of a running one is really longer (the server
//   extends from the current end) and keeps its true count.

const DAY_MS = 24 * 60 * 60 * 1000
const HOUR_MS = 60 * 60 * 1000

const TIER_DAYS: Record<string, number> = {
  sevenDays: 7,
  fifteenDays: 15,
  thirtyDays: 30,
}

export function boostDaysLeft(
  boostedUntil: Date | null | undefined,
  boostTier: string | null | undefined,
  now: number = Date.now(),
): number | null {
  if (!boostedUntil) return null
  const left = boostedUntil.getTime() - now
  if (left <= 0) return 0
  const days = Math.ceil(left / DAY_MS)
  const tierDays = boostTier ? TIER_DAYS[boostTier] : undefined
  if (tierDays !== undefined && days > tierDays && left <= tierDays * DAY_MS + HOUR_MS) {
    return tierDays
  }
  return days
}
