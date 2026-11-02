// The signed-in Guardados: one flat list of listing ids, read live from the
// app's store, users/{uid}/favorites (ADR-046 #1).
import { create } from 'zustand'
import { favoritesService } from '@/services/favoritesService'

interface FavoritesStoreState {
  /** Saved listing ids, newest first. */
  ids: string[]
  isLoading: boolean
  /** The read failed (offline or refused): not "no saves". */
  loadFailed: boolean
  /** The account whose Guardados has arrived at least once (null before). */
  loadedUid: string | null
  _unsubscribe: (() => void) | null
  initialize: (uid: string) => void
  reset: () => void
}

export const useFavoritesStore = create<FavoritesStoreState>((set, get) => ({
  ids: [],
  isLoading: false,
  loadFailed: false,
  loadedUid: null,
  _unsubscribe: null,

  initialize: (uid: string) => {
    get()._unsubscribe?.()
    set({ isLoading: true, loadFailed: false, loadedUid: null })
    const unsubscribe = favoritesService.subscribe(
      uid,
      (ids) => set({ ids, isLoading: false, loadFailed: false, loadedUid: uid }),
      () => set({ isLoading: false, loadFailed: true }),
    )
    set({ _unsubscribe: unsubscribe })
  },

  reset: () => {
    get()._unsubscribe?.()
    set({ ids: [], isLoading: false, loadFailed: false, loadedUid: null, _unsubscribe: null })
  },
}))
