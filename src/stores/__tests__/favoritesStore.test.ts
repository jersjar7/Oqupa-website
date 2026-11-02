// ADR-046 #1: the signed-in Guardados is one flat list of listing ids, read
// live from users/{uid}/favorites (the app's store).
import { describe, it, expect, vi, beforeEach } from 'vitest'

const svc = vi.hoisted(() => ({
  next: null as null | ((ids: string[]) => void),
  fail: null as null | ((e: Error) => void),
  unsubscribe: vi.fn(),
}))
vi.mock('@/services/favoritesService', () => ({
  favoritesService: {
    subscribe: vi.fn((_uid: string, next: (ids: string[]) => void, fail: (e: Error) => void) => {
      svc.next = next
      svc.fail = fail
      return svc.unsubscribe
    }),
  },
}))

import { useFavoritesStore } from '../favoritesStore'
import { favoritesService } from '@/services/favoritesService'

beforeEach(() => {
  vi.clearAllMocks()
  useFavoritesStore.getState().reset()
})

describe('useFavoritesStore', () => {
  it('loads, then holds the ids and which account they belong to', () => {
    useFavoritesStore.getState().initialize('u1')
    expect(favoritesService.subscribe).toHaveBeenCalledWith('u1', expect.any(Function), expect.any(Function))
    expect(useFavoritesStore.getState().isLoading).toBe(true)
    expect(useFavoritesStore.getState().loadedUid).toBeNull()
    svc.next!(['a', 'b'])
    const s = useFavoritesStore.getState()
    expect(s.ids).toEqual(['a', 'b'])
    expect(s.isLoading).toBe(false)
    expect(s.loadedUid).toBe('u1')
  })

  it('a failed read stops loading and is recorded — not "no saves"', () => {
    useFavoritesStore.getState().initialize('u1')
    svc.fail!(new Error('denied'))
    const s = useFavoritesStore.getState()
    expect(s.isLoading).toBe(false)
    expect(s.loadFailed).toBe(true)
    expect(s.loadedUid).toBeNull()
  })

  it('signing out stops listening and forgets the ids', () => {
    useFavoritesStore.getState().initialize('u1')
    svc.next!(['a'])
    useFavoritesStore.getState().reset()
    expect(svc.unsubscribe).toHaveBeenCalled()
    expect(useFavoritesStore.getState().ids).toEqual([])
    expect(useFavoritesStore.getState().loadedUid).toBeNull()
  })
})
