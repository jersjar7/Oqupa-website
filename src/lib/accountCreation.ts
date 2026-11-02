import { create } from 'zustand'

// While an email account is being created and its profile saved, the page
// doing it must stay: Firebase reports the person signed in the moment the
// account exists, and the sign-in pages' GuestGuard used to send them on
// before the profile was saved — so a failed save went unseen and left an
// account with no profile (hostile review 2026-11-02, item 1a).

const useAccountCreationStore = create<{ inFlight: boolean }>(() => ({ inFlight: false }))

export const accountCreation = {
  begin: () => useAccountCreationStore.setState({ inFlight: true }),
  end: () => useAccountCreationStore.setState({ inFlight: false }),
  isInFlight: () => useAccountCreationStore.getState().inFlight,
}

/** For components: re-renders when an account creation starts or ends. */
export function useAccountCreationInFlight(): boolean {
  return useAccountCreationStore((s) => s.inFlight)
}
