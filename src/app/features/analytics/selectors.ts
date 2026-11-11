// ADR-058 — the page's arithmetic: only slicing of the server's series for the
// period the owner picked. No thresholds here; the server decides.

import type { Block, OwnerAnalytics, OwnerListing, PeriodKey, Series } from './types'

const TOTAL_KEYS = ['shown', 'seen', 'contacts', 'saved'] as const

/** Fills what an older or partial record lacks, so no section reads undefined (break-it web 2 #1). */
export function normalizeTotals<T extends Partial<Block['totals']>>(t: T | undefined | null): Block['totals'] {
  const out = { shown: 0, seen: 0, contacts: 0, saved: 0, whatsapp: null } as Block['totals']
  for (const k of TOTAL_KEYS) out[k] = Number(t?.[k]) || 0
  out.whatsapp = t?.whatsapp === null || t?.whatsapp === undefined ? null : Number(t.whatsapp) || 0
  return out
}

export function normalizeBlock(b: unknown): Block | undefined {
  if (!b || typeof b !== 'object' || !('totals' in b)) return undefined
  const block = b as Block
  return { ...block, totals: normalizeTotals(block.totals), previous: block.previous ? normalizeTotals(block.previous) : null }
}

export function normalizeOwner(d: OwnerAnalytics): OwnerAnalytics {
  return {
    ...d,
    listings: Array.isArray(d.listings) ? d.listings : [],
    periods: (d.periods ?? {}) as OwnerAnalytics['periods'],
    countingSince: d.countingSince ?? {},
  }
}

/** Every Lima day from `from` to `to`, inclusive. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = []
  const d = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  while (d <= end && out.length < 400) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

export interface TrendPoint {
  day: string
  shown: number
  seen: number
}

/** The series' days inside the block, one point each. Days the series does not have are left out, never invented. */
export function trendSeries(series: Series | undefined, block: Pick<Block, 'from' | 'to'>): TrendPoint[] {
  if (!series?.start || !Array.isArray(series.seen)) return []
  const days = daysBetween(series.start, block.to)
  const out: TrendPoint[] = []
  days.forEach((day, k) => {
    if (day < block.from || k >= series.seen.length) return
    out.push({ day, shown: series.shown[k] ?? 0, seen: series.seen[k] ?? 0 })
  })
  return out
}

/** The listing's sparkline values for the block's days (same days as the page series). */
export function sparkFor(listing: OwnerListing, series: Series | undefined, block: Pick<Block, 'from' | 'to'>): number[] {
  if (!series?.start) return []
  const days = daysBetween(series.start, block.to)
  const out: number[] = []
  days.forEach((day, k) => {
    const seen = listing.seen ?? []
    if (day >= block.from && k < seen.length) out.push(seen[k] ?? 0)
  })
  return out
}

export interface FunnelStep {
  key: 'shown' | 'seen' | 'saved' | 'contacts' | 'whatsapp'
  label: string
  value: number | null
  /** Percent of the step it is measured against, one decimal; null for the first step or when that base is 0. */
  ofPrevious: number | null
}

/** Mostraron → abrieron → guardaron → pidieron el número → abrieron WhatsApp. */
export function funnelSteps(t: Block['totals']): FunnelStep[] {
  const rows: Array<[FunnelStep['key'], string, number | null]> = [
    ['shown', 'Se mostraron', t.shown],
    ['seen', 'Las abrieron', t.seen],
    ['saved', 'La guardaron', t.saved],
    ['contacts', 'Pidieron tu número', t.contacts],
    ['whatsapp', 'Abrieron WhatsApp', t.whatsapp],
  ]
  // Saving and asking for the number both come after opening it: each is measured against the vistas.
  const base: Record<FunnelStep['key'], number | null> = {
    shown: null, seen: t.shown, saved: t.seen, contacts: t.seen, whatsapp: t.contacts,
  }
  return rows.map(([key, label, value]) => {
    const of = base[key]
    return {
      key, label, value,
      ofPrevious: value === null || !of ? null : Math.round((value / of) * 1000) / 10,
    }
  })
}

export interface PortfolioRow {
  listing: OwnerListing
  shown: number
  seen: number
  contacts: number
  spark: number[]
}

/** Tu cartera for a period: the server's totals per listing, a vistas line, sorted by vistas. */
export function portfolioRows(data: OwnerAnalytics, period: PeriodKey, block: Pick<Block, 'from' | 'to'>): PortfolioRow[] {
  return data.listings
    .map((listing) => {
      const t = listing.totals?.[period] ?? { shown: 0, seen: 0, contacts: 0 }
      return { listing, shown: t.shown, seen: t.seen, contacts: t.contacts, spark: sparkFor(listing, data.series, block) }
    })
    .sort((a, b) => b.seen - a.seen || b.shown - a.shown || a.listing.name.localeCompare(b.listing.name))
}

/** Median days published over the active listings, or null. */
export function medianDays(listings: OwnerListing[]): number | null {
  const xs = listings.map((l) => l.daysPublished).filter((d): d is number => typeof d === 'number').sort((a, b) => a - b)
  if (!xs.length) return null
  const mid = Math.floor(xs.length / 2)
  const at = (k: number) => xs[k] ?? 0
  return Math.round(xs.length % 2 ? at(mid) : (at(mid - 1) + at(mid)) / 2)
}

/** Which listing the per-listing sections show: the one picked, else the server's most-opened one. */
export function focusListingId(data: OwnerAnalytics, scope: string): string | null {
  if (scope !== 'all' && data.listings.some((l) => l.id === scope)) return scope
  return data.featuredListingId ?? data.listings[0]?.id ?? null
}

