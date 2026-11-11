// ADR-058 — ownerAnalytics/{uid}, built nightly by the buildOwnerAnalytics
// Cloud Function (oqupa/functions/lib/owner-analytics.js). The page never
// computes a number of its own beyond sums over these days: the server decides
// what counts and when there is not enough data.

export type Status =
  | 'ok' | 'not-recorded' | 'too-few' | 'too-few-owners' | 'too-few-peers' | 'too-few-peer-vistas'
  | 'needs-area' | 'needs-price'

export interface Totals {
  shown: number
  seen: number
  contacts: number
  saved: number
  /** null until WhatsApp taps are recorded. */
  whatsapp: number | null
}

export interface Thin {
  status: Exclude<Status, 'ok'>
  n?: number
  min?: number
  since?: string | null
}

/** cells: 84 numbers, index = day * 12 + slot (Monday = 0, slot = two hours). */
export type Heat = Thin | { status: 'ok'; n: number; cells: number[]; best: { day: number; slot: number } }

export type Sources =
  | (Thin & { kind?: 'via' | 'platform' })
  | { status: 'ok'; kind: 'via' | 'platform'; n: number; parts: Record<string, number> }

export type Places =
  | Thin
  | { status: 'ok'; n: number; districts: Record<string, number>; away: Record<string, number>; since: string }

export interface Marks {
  status: 'ok'
  list: Array<{ day: string; kind: 'price-down' | 'price-up' | 'photos'; listingId: string }>
  pricesSince: string | null
  photosSince: string | null
}

export type Zone =
  | Thin
  | {
      status: 'ok'; n: number; mine: number; median: number; step: number; pct: number
      bins: Array<{ from: number; count: number }>; district: string | null; usdRate: number
    }

export type Compare = Thin | { status: 'ok'; n: number; tenths: number; district: string | null }
export type DaysToClose = Thin | { status: 'ok'; n: number; area: 'district' | 'province'; median: number }
export type ContactRate = Thin | { status: 'ok'; n: number; mine: number; zone: number }
export type Demand = Thin | { status: 'ok'; n: number; topRange: [number, number]; perListing: Record<string, number> }

export interface Block {
  from: string
  to: string
  totals: Totals
  /** null when the period before started before counting began. */
  previous: Totals | null
  heat: Heat
  sources: Sources
  places: Places
  marks: Marks
  demand: Demand
  // Per listing only:
  zone?: Zone
  compare?: Compare
  daysToClose?: DaysToClose
  contactRate?: ContactRate
}

export type NoteKind =
  | { kind: 'ok' }
  | { kind: 'closed' }
  | { kind: 'inactive' }
  | { kind: 'no-views'; days: number }
  | { kind: 'price-above'; pct: number }
  | { kind: 'few-photos'; photos: number }

/** Parallel daily arrays from `start` (the first counted day, or 90 days back) to the day before today. */
export interface Series {
  start: string
  shown: number[]
  seen: number[]
  contacts: number[]
}

export interface OwnerListing {
  id: string
  name: string
  sub: string
  propertyType: string | null
  operationType: string | null
  status: string
  district: string | null
  publishedDay: string | null
  daysPublished: number | null
  photoCount: number
  photoKey: string | null
  saves: number
  totals: Record<PeriodKey, { shown: number; seen: number; contacts: number }>
  /** Vistas per day on the page series' days — the sparkline. */
  seen: number[]
  note: NoteKind
}

export type PeriodKey = '7' | '30' | '90'

/** ownerAnalytics/{uid}: the page. */
export interface OwnerAnalytics {
  ownerId: string
  today: string
  dataTo: string
  builtAt?: { toDate(): Date } | Date | null
  countingSince: Record<string, string | null>
  thresholds: Record<string, number>
  featuredListingId: string | null
  series: Series
  listings: OwnerListing[]
  periods: Record<PeriodKey, Block>
}

/** ownerListingAnalytics/{listingId}: one listing. */
export interface ListingAnalytics {
  listingId: string
  ownerId: string
  today: string
  series: Series
  periods: Record<PeriodKey, Block>
}
