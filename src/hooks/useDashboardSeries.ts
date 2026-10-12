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
