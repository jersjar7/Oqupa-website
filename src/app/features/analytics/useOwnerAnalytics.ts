import { useEffect, useRef, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '@/lib/firebase'
import type { ListingAnalytics, OwnerAnalytics } from './types'
import { normalizeOwner } from './selectors'

export type AnalyticsState =
  | { status: 'loading' }
  | { status: 'none' } // the server says this person has no listing it shows
  | { status: 'error' }
  | { status: 'ready'; data: OwnerAnalytics; refreshing: boolean }

/** A page built more than this long ago means the nightly build missed it: ask for a rebuild. */
const STALE_AFTER_MS = 30 * 60 * 60 * 1000
/** How long to wait for a just-built page to arrive before saying something went wrong. */
const ARRIVAL_WAIT_MS = 20_000

const millisOf = (v: OwnerAnalytics['builtAt']): number | null => {
  if (!v) return null
  if (v instanceof Date) return v.getTime()
  return typeof v.toDate === 'function' ? v.toDate().getTime() : null
}

type RefreshAnswer = { rebuilt: boolean; reason?: string | null }

/**
 * The owner's own ownerAnalytics/{uid} (ADR-058), live. When it is missing, or
 * older than a day and a few hours (the nightly build missed it), asks the
 * server once to rebuild it. Only the server's "no-listings" answer means "you
 * have nothing to show"; anything else that leaves no page is an error, never
 * the invitation to publish (break-it web #2).
 */
export function useOwnerAnalytics(uid: string | null | undefined): AnalyticsState {
  const [state, setState] = useState<AnalyticsState>({ status: 'loading' })
  const asked = useRef(false)
  const hasPage = useRef(false)

  useEffect(() => {
    if (!uid) return
    asked.current = false
    hasPage.current = false
    let waitTimer: ReturnType<typeof setTimeout> | null = null

    const refresh = () => {
      if (asked.current) return
      asked.current = true
      setState((s) => (s.status === 'ready' ? { ...s, refreshing: true } : s))
      httpsCallable<unknown, RefreshAnswer>(getFunctions(undefined, 'southamerica-east1'), 'refreshOwnerAnalytics')({})
        .then(({ data }) => {
          if (hasPage.current) return
          if (data?.reason === 'no-listings') setState({ status: 'none' })
          else if (data?.rebuilt) {
            // The page is written; its snapshot may arrive a moment after this answer.
            waitTimer = setTimeout(() => { if (!hasPage.current) setState({ status: 'error' }) }, ARRIVAL_WAIT_MS)
          } else setState({ status: 'error' })
        })
        .catch(() => { if (!hasPage.current) setState({ status: 'error' }) })
        .finally(() => setState((s) => (s.status === 'ready' ? { ...s, refreshing: false } : s)))
    }

    const unsub = onSnapshot(
      doc(db, 'ownerAnalytics', uid),
      (snap) => {
        if (!snap.exists()) {
          // A page that existed and is gone (the nightly removed it): ask once more,
          // whatever happened before, so the answer decides what to show (break-it web 2 #3).
          if (hasPage.current) {
            asked.current = false
            setState({ status: 'loading' })
          }
          hasPage.current = false
          refresh()
          return
        }
        hasPage.current = true
        const data = normalizeOwner(snap.data() as OwnerAnalytics)
        setState((s) => ({ status: 'ready', data, refreshing: s.status === 'ready' ? s.refreshing : false }))
        const built = millisOf(data.builtAt)
        if (built === null || Date.now() - built > STALE_AFTER_MS) refresh()
      },
      () => { if (!hasPage.current) setState({ status: 'error' }) },
    )
    return () => {
      unsub()
      if (waitTimer) clearTimeout(waitTimer)
    }
  }, [uid])

  return state
}

/**
 * One listing's numbers (ownerListingAnalytics/{id}), live. `missing` = the
 * server has no record for it yet (or it cannot be read) — the page says so
 * instead of spinning (break-it web #3).
 */
export function useListingAnalytics(listingId: string | null): { data: ListingAnalytics | null; loading: boolean; missing: boolean } {
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
  if (!listingId) return { data: null, loading: false, missing: false }
  if (state.id !== listingId || state.loading) return { data: null, loading: true, missing: false }
  return { data: state.data, loading: false, missing: !state.data }
}
