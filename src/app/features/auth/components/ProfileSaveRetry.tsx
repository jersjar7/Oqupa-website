import { useEffect, useState } from 'react'
import { retryNewProfile } from '../lib/createEmailAccount'
import { accountCreation } from '@/lib/accountCreation'

export const PROFILE_SAVE_FAILED =
  'Tu cuenta quedó creada, pero no pudimos guardar tus datos. Revisa tu internet y toca «Reintentar».'

/**
 * Shown when the account was created but its profile could not be saved
 * (hostile review 2026-11-02, item 1a). The page stays; "Reintentar" saves
 * the profile, sends the confirmation email, then [onDone] moves on.
 */
export default function ProfileSaveRetry({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [failedAgain, setFailedAgain] = useState(false)
  // Leaving this page (any navigation) lets go of the page hold and asks the
  // store to repair the profile — never stuck without one (second review
  // 2026-11-02, item 2).
  useEffect(
    () => () => {
      accountCreation.end()
      void import('@/stores/authStore')
        .then(({ useAuthStore }) => useAuthStore.getState().ensureProfile())
        .catch(() => {})
    },
    [],
  )
  return (
    <div className="rounded-xl bg-background-secondary/60 p-3" role="alert">
      <p className="text-base text-error">{PROFILE_SAVE_FAILED}</p>
      {failedAgain && <p className="mt-1 text-sm text-text-secondary">Todavía no pudimos. Inténtalo otra vez en un momento.</p>}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          try {
            await retryNewProfile()
            onDone()
          } catch {
            setFailedAgain(true)
          } finally {
            setBusy(false)
          }
        }}
        className="mt-2 min-h-11 font-sans text-base font-bold uppercase tracking-[1px] text-secondary hover:text-secondary-hover disabled:opacity-60"
      >
        {busy ? 'Guardando…' : 'Reintentar'}
      </button>
    </div>
  )
}
