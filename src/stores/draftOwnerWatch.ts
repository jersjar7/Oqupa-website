import { useAuthStore } from './authStore'
import { setDraftAccount, useListingFormStore } from './listingFormStore'

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
  // The draft (from this tab's storage) is claimed by — or, if another
  // account's, dropped for — whoever is signed in: now, and at every change
  // of account. A page load always passes through "nobody yet", so this
  // also runs before the wizard can show a draft that is not theirs.
  const adopt = (uid: string | null) => {
    setDraftAccount(uid)
    if (!uid) return
    const form = useListingFormStore.getState()
    if (form.isEditMode) return
    form.adoptDraftFor(uid)
  }
  adopt(useAuthStore.getState().firebaseUser?.uid ?? null)
  return useAuthStore.subscribe((state, previous) => {
    const uid = state.firebaseUser?.uid ?? null
    if (uid !== (previous.firebaseUser?.uid ?? null)) adopt(uid)
  })
}
