import { useEffect, useRef } from 'react'
import { firestoreService } from '@/services/firestoreService'
import { useAuthStore } from '@/stores/authStore'

// Fire-and-forget view tracking for the public property detail page. Fires for
// both authenticated and anonymous visitors via the `recordListingView` Cloud
// Function. Server enforces self-view skip + one-per-day dedupe (by uid when
// signed in, by localStorage clientId when anonymous).
export function useRecordListingView(
  listingId: string | undefined,
  ownerId: string | undefined,
) {
  const firebaseUser = useAuthStore((state) => state.firebaseUser)
  const user = useAuthStore((state) => state.user)
  const firedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!listingId || !ownerId) return
    if (user && user.id === ownerId) return

    const principal = firebaseUser?.uid ?? 'anon'
    const key = `${listingId}:${principal}`
    if (firedKeyRef.current === key) return
    firedKeyRef.current = key

    firestoreService.recordListingView(listingId).catch(() => {
      // Silent — offline, App Check failure, rate-limit, etc. must not surface.
    })
  }, [listingId, firebaseUser, user, ownerId])
}
