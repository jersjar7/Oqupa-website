import { useAuthStore } from './authStore'
import { setDraftAccount, useListingFormStore } from './listingFormStore'
import { noteSignedInAccount } from '@/lib/returnPath'

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
  // The last account signed in here: an edit in memory is theirs.
  let editAccount: string | null = null
  const adopt = (uid: string | null) => {
    setDraftAccount(uid)
    // Whose way back a bounce to the sign-in page would be.
    noteSignedInAccount(uid)
    if (!uid) return
    const form = useListingFormStore.getState()
    if (form.isEditMode) {
      // An edit holds the listing's true (possibly hidden) address: another
      // account never inherits it (third review #1). The same account
      // coming back after its session ended keeps it.
      if (editAccount && editAccount !== uid) form.reset()
      editAccount = uid
      return
    }
    editAccount = uid
    form.adoptDraftFor(uid)
  }
  adopt(useAuthStore.getState().firebaseUser?.uid ?? null)
  return useAuthStore.subscribe((state, previous) => {
    const uid = state.firebaseUser?.uid ?? null
    if (uid !== (previous.firebaseUser?.uid ?? null)) adopt(uid)
  })
}
