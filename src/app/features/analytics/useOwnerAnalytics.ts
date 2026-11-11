import { useEffect, useRef, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '@/lib/firebase'
import type { ListingAnalytics, OwnerAnalytics } from './types'

export type AnalyticsState =
  | { status: 'loading' }
  | { status: 'none' } // no listings: nothing was built for this person
  | { status: 'error' }
  | { status: 'ready'; data: OwnerAnalytics; refreshing: boolean }

/** Lima's calendar day now, 'YYYY-MM-DD'. */
export const limaToday = (now = new Date()) => now.toLocaleDateString('en-CA', { timeZone: 'America/Lima' })

/**
 * The owner's own ownerAnalytics/{uid} (ADR-058), live. When it is missing or
 * was built before today (Lima), asks the server once to rebuild it — the
 * server allows that at most every 10 minutes, so a reload cannot hammer it.
 */
export function useOwnerAnalytics(uid: string | null | undefined): AnalyticsState {
  const [state, setState] = useState<AnalyticsState>({ status: 'loading' })
  const asked = useRef(false)

  useEffect(() => {
    if (!uid) return
    asked.current = false
    const refresh = () => {
      if (asked.current) return
      asked.current = true
      setState((s) => (s.status === 'ready' ? { ...s, refreshing: true } : s))
      httpsCallable(getFunctions(undefined, 'southamerica-east1'), 'refreshOwnerAnalytics')({})
        .catch(() => undefined)
        .finally(() => setState((s) => {
          if (s.status === 'ready') return { ...s, refreshing: false }
          // Rebuilt and still nothing: this person has no listings to show.
          return s.status === 'loading' ? { status: 'none' } : s
        }))
    }
    const unsub = onSnapshot(
      doc(db, 'ownerAnalytics', uid),
      (snap) => {
        if (!snap.exists()) {
          refresh()
          if (asked.current) setState((s) => (s.status === 'ready' ? { status: 'none' } : s))
          return
        }
        const data = snap.data() as OwnerAnalytics
        setState((s) => ({ status: 'ready', data, refreshing: s.status === 'ready' ? s.refreshing : false }))
        if (data.today !== limaToday()) refresh()
      },
      () => setState({ status: 'error' }),
    )
    return unsub
  }, [uid])

  return state
}

/** One listing's numbers (ownerListingAnalytics/{id}), live; null while loading or when there are none. */
export function useListingAnalytics(listingId: string | null): { data: ListingAnalytics | null; loading: boolean } {
  const [state, setState] = useState<{ id: string | null; data: ListingAnalytics | null; loading: boolean }>({ id: null, data: null, loading: false })
  useEffect(() => {
    if (!listingId) return
    setState({ id: listingId, data: null, loading: true })
    return onSnapshot(
      doc(db, 'ownerListingAnalytics', listingId),
      (snap) => setState({ id: listingId, data: snap.exists() ? (snap.data() as ListingAnalytics) : null, loading: false }),
      () => setState({ id: listingId, data: null, loading: false }),
    )
  }, [listingId])
  if (!listingId) return { data: null, loading: false }
  return state.id === listingId ? { data: state.data, loading: state.loading } : { data: null, loading: true }
}
