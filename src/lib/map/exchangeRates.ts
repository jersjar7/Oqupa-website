// One soles-per-dollar rate for the list's price sorts (ADR-031 item 19, Jerson
// 2026-10-24) — the same rules as the app's ExchangeRateService: fetched once
// per visit, in the background, never blocking anything, from the free keyless
// service the app's filter sheet already used (open.er-api.com). Measured
// 2026-10-24: it answered in 0.05–0.12 s and the real rate was 3.44, not the
// fixed 3.75 used until then. If the fetch fails, the last rate saved in this
// browser; with nothing saved, the fixed default.

/** Used only when no live or saved rate is available. Same as the app. */
export const DEFAULT_PEN_PER_USD = 3.75

export const EXCHANGE_RATE_URL = 'https://open.er-api.com/v6/latest/USD'
export const EXCHANGE_RATE_STORAGE_KEY = 'oqupa_pen_per_usd_v1'

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** Reads `rates.PEN` from the service's answer, or null. */
export function parsePenPerUsd(body: unknown): number | null {
  const rates = (body as { rates?: unknown } | null)?.rates
  const pen = rates && typeof rates === 'object' ? (rates as Record<string, unknown>).PEN : undefined
  return typeof pen === 'number' && Number.isFinite(pen) ? pen : null
}

/** A soles-per-dollar rate outside this range is a broken answer, not a
 *  currency move (it has been between 2.5 and 4.5 for decades). */
const plausible = (rate: number | null | undefined): rate is number =>
  typeof rate === 'number' && rate > 1 && rate < 10

export function savedPenPerUsd(storage: KeyValueStorage | null): number | null {
  try {
    const raw = storage?.getItem(EXCHANGE_RATE_STORAGE_KEY)
    const n = raw == null ? NaN : Number(raw)
    return plausible(n) ? n : null
  } catch {
    return null
  }
}

/** The best rate available: live (and saved for next time), else saved, else
 *  the default. Never throws. */
export async function resolvePenPerUsd(deps: {
  fetchRate: () => Promise<number | null>
  storage: KeyValueStorage | null
}): Promise<number> {
  try {
    const live = await deps.fetchRate()
    if (plausible(live)) {
      try {
        deps.storage?.setItem(EXCHANGE_RATE_STORAGE_KEY, String(live))
      } catch {
        // A blocked storage only costs next visit's fallback.
      }
      return live
    }
  } catch {
    // Offline or the service is down — fall back below.
  }
  return savedPenPerUsd(deps.storage) ?? DEFAULT_PEN_PER_USD
}

/** The real fetch, with a timeout so a hanging service never matters. */
export async function fetchLivePenPerUsd(timeoutMs = 8000): Promise<number | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(EXCHANGE_RATE_URL, { signal: controller.signal })
    if (!res.ok) return null
    return parsePenPerUsd(await res.json())
  } finally {
    clearTimeout(timer)
  }
}

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

let visitRate: Promise<number> | null = null

/** Once per visit: the rate the list sorts with. */
export function penPerUsdForThisVisit(): Promise<number> {
  visitRate ??= resolvePenPerUsd({ fetchRate: () => fetchLivePenPerUsd(), storage: defaultStorage() })
  return visitRate
}

/** Instant answer before the visit's fetch finishes: the saved rate, else the default. */
export function penPerUsdRightNow(): number {
  return savedPenPerUsd(defaultStorage()) ?? DEFAULT_PEN_PER_USD
}
