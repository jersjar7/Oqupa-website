import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { applyAnalyticsLabels } from '@/services/analyticsLabelsService'

/**
 * Applies the signed-in person's Analytics labels once per session (metrics
 * plan A12c). Rendered once at the app root, like ListStoreInitializer: it
 * only listens to who is signed in and changes nothing about sign-in or
 * sign-up. Keyed on the uid, so a refreshed token or profile does not re-read
 * the labels; signing out and in, or another person signing in, does.
 */
export default function AnalyticsLabelsInitializer() {
  const uid = useAuthStore((s) => s.firebaseUser?.uid ?? null)

  useEffect(() => {
    if (!uid) return
    // A slow read must not land on whoever signs in after this person.
    let current = true
    void applyAnalyticsLabels(uid, { isStillSignedIn: () => current })
    return () => { current = false }
  }, [uid])

  return null
}
