import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { DailySeries } from '@/app/features/metrics/lib/series'

/** One listing, described without anything that identifies it. */
export interface SeriesListing {
  day: string | null
  active: boolean
  operation: string | null
  type: string | null
  district: string
  contacted: boolean
  viewed: boolean
}

/** One close-survey answer, without who gave it or for which listing. */
export interface CloseSurveyRow {
  day: string | null
  outcome: 'sold' | 'rented' | null
  viaOqupa: 'yes' | 'no' | 'skip' | null
  channel: string | null
  feedback: string | null
  /** The comment existed but did not fit the page's size budget. */
  feedbackOmitted?: boolean
}

/** Close-survey totals per Lima day, from every answer (not the capped rows). */
export type CloseCounts = Record<string, { yes: number; no: number; skip: number; channels: Record<string, number> }>

interface HeadlineWindow {
  from: string
  to: string
  days: number
}

/** The A1b headline tiles' server-side numbers. Absent on documents built before 2026-10-23. */
export interface DashboardHeadline {
  /** Active listings (team-owned left out) with an unlock in the last 14 days. */
  liquidity: HeadlineWindow & { activeListings: number; contacted: number }
  /** Median hours from publishing to the first unlock, over listings first contacted in the window. */
  timeToFirstContact: HeadlineWindow & { listings: number; medianHours: number | null }
  /** People active in the window; buyers and renters among them (a person can be both). */
  seekers: HeadlineWindow & { active: number; buyer: number; renter: number }
  /** From the newest daily summary carrying the boost report (A7) and claim limit (A4). */
  summary: {
    date: string
    attachRate: { window: HeadlineWindow; newListings: number; boosted: number; rate: number | null } | null
    lift: {
      measured: number
      vsSimilar: { boosts: number; lift: number | null }
      vsBefore: { boosts: number; lift: number | null }
    } | null
    realtorClaimLimit: { month: string; limit: number; realtorsAtLimit: number }
  } | null
}

/** dashboardSeries/current, rebuilt nightly by the buildDashboardSeries Cloud Function. */
export interface DashboardSeries {
  today: string
  generatedAt: Date
  series: {
    views: DailySeries
    verifiedNew: DailySeries
    activeListings: DailySeries
    spendUSD: DailySeries
    accountsNew: DailySeries
    contactsReal: DailySeries
    checkoutsStarted: DailySeries
    checkoutsPaid: DailySeries
    revenuePEN: DailySeries
  }
  /** Null when Google Analytics was unavailable (always on staging). */
  analytics: {
    installs: DailySeries
    uninstalls: DailySeries
    webUsers: DailySeries
    appUsers: DailySeries
    metaInstalls: DailySeries
    installsBySource: Record<string, Record<string, number>>
  } | null
  listings: SeriesListing[]
  /** Listings marked sold / rented right now, team excluded. Absent on documents built before 2026-10-20. */
  closed?: { sold: number; rented: number }
  /** "¿Lo vendiste gracias a Oqupa?" answers, newest first, team excluded. */
  closeSurveys?: CloseSurveyRow[]
  /** Absent on documents built before 2026-10-20 evening. */
  closeCounts?: CloseCounts
  headline?: DashboardHeadline
  metaReported: { installs?: number; spendUSD?: number } | null
  since: { snapshots: string | null; contactLog: string | null; analytics: string | null }
}

interface UseDashboardSeries {
  data: DashboardSeries | null
  isLoading: boolean
  error: string | null
}

export function useDashboardSeries(): UseDashboardSeries {
  const [data, setData] = useState<DashboardSeries | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getDoc(doc(db, 'dashboardSeries', 'current'))
      .then((snap) => {
        if (cancelled) return
        if (snap.exists()) {
          const raw = snap.data() as Omit<DashboardSeries, 'generatedAt'> & {
            generatedAt?: { toDate: () => Date }
          }
          setData({ ...raw, generatedAt: raw.generatedAt?.toDate?.() ?? new Date() })
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { data, isLoading, error }
}
