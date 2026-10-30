import { create } from 'zustand'
import { listService } from '@/services/listService'
import type { UserList } from '@/types/userList'

interface ListStoreState {
  lists: UserList[]
  isLoading: boolean
  /** The account whose lists have arrived at least once (null before). */
  loadedUid: string | null
  _unsubscribe: (() => void) | null
  initialize: (uid: string) => void
  reset: () => void
}

export const useListStore = create<ListStoreState>((set, get) => ({
  lists: [],
  isLoading: false,
  loadedUid: null,
  _unsubscribe: null,

  initialize: (uid: string) => {
    get()._unsubscribe?.()
    set({ isLoading: true, loadedUid: null })
    const unsubscribe = listService.subscribe(uid, (lists) => {
      set({ lists, isLoading: false, loadedUid: uid })
    })
    set({ _unsubscribe: unsubscribe })
  },

  reset: () => {
    get()._unsubscribe?.()
    set({ lists: [], isLoading: false, loadedUid: null, _unsubscribe: null })
  },
}))

export function isSavedInAnyList(lists: UserList[], listingId: string): boolean {
  return lists.some((l) => l.listingIds.includes(listingId))
}

export function getListsContaining(lists: UserList[], listingId: string): UserList[] {
  return lists.filter((l) => l.listingIds.includes(listingId))
}
