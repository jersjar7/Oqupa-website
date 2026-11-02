import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useFavoritesStore } from '@/stores/favoritesStore'
import { useDeviceSavesStore } from '@/stores/deviceSavesStore'
import { favoritesService } from '@/services/favoritesService'
import { mergeDeviceSaves } from '@/lib/mergeDeviceSaves'
import { isAccountReady } from '@/lib/accountReady'

// Signed in, Guardados is read live from the app's store (ADR-046 #1). Once
// it has arrived — before that, "nothing saved" would be a guess:
// - a visitor's device saves move in (Guardados sin cuenta, 2026-10-25);
// - the website's old named lists move in, once per sign-in.
export default function GuardadosInitializer() {
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const initialize = useFavoritesStore((s) => s.initialize)
  const reset = useFavoritesStore((s) => s.reset)
  const savedIds = useFavoritesStore((s) => s.ids)
  const loadedUid = useFavoritesStore((s) => s.loadedUid)
  const ready = useAuthStore((s) => isAccountReady(s.firebaseUser, s.user))
  const deviceIds = useDeviceSavesStore((s) => s.ids)
  const clearDevice = useDeviceSavesStore((s) => s.clear)
  const merging = useRef(false)
  const listsMovedFor = useRef<string | null>(null)
  const uid = firebaseUser?.uid

  // A failed move keeps the saves on the device; the next sign-in retries.
  useEffect(() => {
    // Only a fully set-up account: an abandoned sign-up must not take the
    // visitor's saves with it (hostile review 2026-10-25; the app waits too).
    if (!uid || !ready || loadedUid !== uid || deviceIds.length === 0 || merging.current) return
    merging.current = true
    void mergeDeviceSaves({ uid, savedIds, deviceIds, service: favoritesService, clear: clearDevice }).finally(() => {
      merging.current = false
    })
  }, [uid, ready, loadedUid, savedIds, deviceIds, clearDevice])

  // The old lists: every save moves, nothing is deleted, and a failure is
  // tried again at the next sign-in (ADR-046 #1).
  useEffect(() => {
    if (!uid) {
      listsMovedFor.current = null
      return
    }
    if (loadedUid !== uid || listsMovedFor.current === uid) return
    listsMovedFor.current = uid
    favoritesService.moveListsIn(uid, new Set(savedIds)).catch(() => {})
  }, [uid, loadedUid, savedIds])

  useEffect(() => {
    if (uid) initialize(uid)
    else reset()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  return null
}
