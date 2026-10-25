import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useListStore } from '@/stores/listStore'
import { useDeviceSavesStore } from '@/stores/deviceSavesStore'
import { listService } from '@/services/listService'
import { mergeDeviceSaves } from '@/lib/mergeDeviceSaves'

export default function ListStoreInitializer() {
  const firebaseUser = useAuthStore((s) => s.firebaseUser)
  const initialize = useListStore((s) => s.initialize)
  const reset = useListStore((s) => s.reset)
  const lists = useListStore((s) => s.lists)
  const loadedUid = useListStore((s) => s.loadedUid)
  const deviceIds = useDeviceSavesStore((s) => s.ids)
  const clearDevice = useDeviceSavesStore((s) => s.clear)
  const merging = useRef(false)

  // Signed in with saves made as a visitor: move them into Guardados once
  // the account's lists have arrived — before that, "no lists" would create
  // a second Guardados (Guardados sin cuenta, 2026-10-25).
  // A failed move keeps them on the device; the next sign-in retries.
  useEffect(() => {
    const uid = firebaseUser?.uid
    if (!uid || loadedUid !== uid || deviceIds.length === 0 || merging.current) return
    merging.current = true
    void mergeDeviceSaves({ uid, lists, deviceIds, service: listService, clear: clearDevice }).finally(() => {
      merging.current = false
    })
  }, [firebaseUser?.uid, loadedUid, lists, deviceIds, clearDevice])

  useEffect(() => {
    if (firebaseUser) {
      initialize(firebaseUser.uid)
    } else {
      reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser?.uid])

  return null
}
