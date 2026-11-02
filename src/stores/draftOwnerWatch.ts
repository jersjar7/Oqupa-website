import { useAuthStore } from './authStore'
import { useListingFormStore } from './listingFormStore'

/**
 * Keeps the publishing draft with the account that started it (hostile
 * review #1). When a DIFFERENT account signs in on this tab, the draft —
 * photos, address, description, publish identity — is dropped. A session
 * that ends by itself (no account for a moment) changes nothing: the same
 * account signing back in finds its draft. A deliberate sign-out clears the
 * draft in authService.logout.
 *
 * Returns the unsubscribe function.
 */
export function watchDraftOwner(): () => void {
  return useAuthStore.subscribe((state, previous) => {
    const uid = state.firebaseUser?.uid ?? null
    if (!uid || uid === (previous.firebaseUser?.uid ?? null)) return
    const form = useListingFormStore.getState()
    if (form.isEditMode) return
    const owner = form.draftOwnerId ?? form.publishOwnerId
    if (owner && owner !== uid) form.discardDraft()
  })
}
