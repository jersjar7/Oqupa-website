import { consumeReturnUrl, setReturnUrl } from '@/lib/utils'

/**
 * "Usar otra cuenta": leave the account that is signed in — usually one
 * half-way through sign-up — and choose another, without losing the listing
 * the person was trying to reach (approved by Jerson 2026-10-24).
 *
 * On a phone the website had no way out of an unfinished account: the header
 * hides "Salir" to make room for the publish button, and the sign-up steps
 * offered no exit. Nothing is deleted here; an account that is never finished
 * is removed by the 30-day cleanup.
 *
 * From the contact window (`returnTo` given) the person is looking at the
 * listing, so it is stored afresh — timer restarted — for the next account.
 * Anywhere else, any pending errand is forgotten: the person switching may be
 * someone else on the same phone, and inheriting it would open WhatsApp to a
 * seller they never chose and stamp that listing on their new account's
 * sign-up record (hostile review 2026-10-24).
 */
export async function switchAccount({
  logout,
  navigate,
  returnTo,
}: {
  logout: () => Promise<void>
  navigate: (to: string, options?: { replace?: boolean }) => void
  returnTo?: string
}): Promise<void> {
  if (returnTo) setReturnUrl(returnTo)
  else consumeReturnUrl()
  // Sign out first: the sign-in door sends a signed-in person straight back.
  await logout()
  navigate('/app/login', { replace: true })
}
