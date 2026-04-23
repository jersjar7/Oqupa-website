import { useEffect, useRef } from 'react'
import { firestoreService } from '@/services/firestoreService'
import { useAuthStore } from '@/stores/authStore'

// Fire-and-forget view tracking for the public property detail page.
// Mirrors Flutter's recordPropertyView: auth-gated, skips self-views,
// one-per-day-per-user dedupe handled server-side inside a Firestore transaction.
export function useRecordListingView(
  listingId: string | undefined,
  ownerId: string | undefined,
) {
  const firebaseUser = useAuthStore((state) => state.firebaseUser)
  const user = useAuthStore((state) => state.user)
  const firedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!listingId || !firebaseUser || !user || !ownerId) return
    if (user.id === ownerId) return

    const key = `${listingId}:${firebaseUser.uid}`
    if (firedKeyRef.current === key) return
    firedKeyRef.current = key

    firestoreService.recordListingView(listingId, firebaseUser.uid).catch(() => {
      // Silent — offline, permission-denied, etc. must not surface to the user.
    })
  }, [listingId, firebaseUser, user, ownerId])
}
