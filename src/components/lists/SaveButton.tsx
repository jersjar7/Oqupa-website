import { useState } from 'react'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { useFavoritesStore } from '@/stores/favoritesStore'
import { useDeviceSavesStore } from '@/stores/deviceSavesStore'
import { isAccountReady } from '@/lib/accountReady'
import { favoritesService } from '@/services/favoritesService'
import { Spinner } from '@/app/components/ui'

interface SaveButtonProps {
  listingId: string
  className?: string
  /** 'card': white heart on a dark circle, over a photo. 'plain': just the
   *  heart — faded red outline, full red once saved — on a white card (the
   *  slim map card; Jerson, 2026-10-25). 'page': the labelled button. */
  variant?: 'card' | 'plain' | 'page'
}

// One Guardados, the app's store (ADR-046 #1): an empty heart saves and a full
// heart un-saves, in one tap, like the app. No named lists.
export default function SaveButton({ listingId, className = '', variant = 'card' }: SaveButtonProps) {
  const authUser = useAuthStore((s) => s.firebaseUser)
  // Until the account is fully set up, hearts save in the browser; the saves
  // move in when it is ready (hostile review 2026-10-25).
  const ready = useAuthStore((s) => isAccountReady(s.firebaseUser, s.user))
  const firebaseUser = ready ? authUser : null
  const deviceIds = useDeviceSavesStore((s) => s.ids)
  const toggleDeviceSave = useDeviceSavesStore((s) => s.toggle)
  const savedIds = useFavoritesStore((s) => s.ids)
  const arrived = useFavoritesStore((s) => !!authUser && s.loadedUid === authUser.uid)
  const loadFailed = useFavoritesStore((s) => s.loadFailed === true)
  const [busy, setBusy] = useState(false)

  // Someone mid set-up may already have saves in the account from before: a
  // listing there shows saved, and its heart un-saves it there (re-review).
  const inAccount = !!authUser && savedIds.includes(listingId)
  const inDevice = deviceIds.includes(listingId)
  const saved = firebaseUser ? inAccount : inDevice || inAccount

  async function unsave(uid: string) {
    setBusy(true)
    try {
      await favoritesService.remove(uid, listingId)
      // The app's words (favorites_bloc).
      toast.success('Quitado de Guardados')
    } catch {
      toast.error('No se pudo quitar de Guardados. Vuelve a intentarlo.')
    } finally {
      setBusy(false)
    }
  }

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    // A visitor (or an account mid set-up): the heart saves and un-saves in
    // this browser. The card after the third save is for visitors only.
    if (!firebaseUser) {
      if (authUser && inAccount && !inDevice) {
        await unsave(authUser.uid)
        return
      }
      toggleDeviceSave(listingId, { canNudge: !authUser })
      return
    }

    // Guardados has not arrived yet: wait rather than guess.
    if (!arrived) {
      // The read failed: say so instead of doing nothing (audit 2026-11-02).
      if (loadFailed) toast.error('No pudimos cargar tus guardados. Vuelve a intentarlo.')
      return
    }

    if (saved) {
      await unsave(firebaseUser.uid)
      return
    }

    setBusy(true)
    try {
      await favoritesService.add(firebaseUser.uid, listingId)
      // "Guardado" on every save, as in the app (audit 2026-11-02).
      toast.success('Guardado')
    } catch {
      toast.error('No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      aria-label={saved ? 'Quitar de Guardados' : 'Guardar propiedad'}
      aria-pressed={saved}
      className={
        variant === 'page'
          ? `inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 font-sans text-sm font-medium uppercase tracking-wide transition-colors hover:bg-black/5 ${
              saved ? 'border-error/30 text-error' : 'border-border text-text-secondary'
            } ${className}`
          : variant === 'plain'
            ? `flex h-8 w-8 items-center justify-center rounded-full transition-transform active:scale-90 ${className}`
            : `flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm transition-colors hover:bg-black/60 ${className}`
      }
    >
      {busy ? (
        <Spinner size="sm" />
      ) : variant === 'page' ? (
        <>
          <Heart className={`h-4 w-4 ${saved ? 'fill-error text-error' : ''}`} />
          {saved ? 'Guardado' : 'Guardar'}
        </>
      ) : variant === 'plain' ? (
        <Heart
          strokeWidth={2.25}
          className={`h-5 w-5 transition-colors ${
            saved ? 'fill-error text-error' : 'fill-transparent text-error/60'
          }`}
        />
      ) : (
        <Heart
          className={`h-4 w-4 transition-colors ${
            saved ? 'fill-error text-error' : 'fill-transparent text-white'
          }`}
        />
      )}
    </button>
  )
}
