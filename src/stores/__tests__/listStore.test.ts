import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from '@testing-library/react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const subscribeMock = vi.fn()

vi.mock('@/services/listService', () => ({
  listService: {
    subscribe: (...args: unknown[]) => subscribeMock(...args),
  },
}))

import { isSavedInAnyList, getListsContaining, useListStore } from '../listStore'
import type { UserList } from '@/types/userList'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function list(id: string, listingIds: string[]): UserList {
  return {
    id,
    name: `List ${id}`,
    listingIds,
    ownerId: 'owner-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as UserList
}

const favs = list('favs', ['listing-a', 'listing-b'])
const work = list('work', ['listing-c'])
const empty = list('empty', [])

// ---------------------------------------------------------------------------
// isSavedInAnyList
// ---------------------------------------------------------------------------
describe('isSavedInAnyList', () => {
  it('returns true when the listing is in one of the lists', () => {
    expect(isSavedInAnyList([favs, work], 'listing-a')).toBe(true)
  })

  it('returns true when the listing is in the second list', () => {
    expect(isSavedInAnyList([favs, work], 'listing-c')).toBe(true)
  })

  it('returns false when the listing is in none of the lists', () => {
    expect(isSavedInAnyList([favs, work], 'listing-z')).toBe(false)
  })

  it('returns false for an empty lists array', () => {
    expect(isSavedInAnyList([], 'listing-a')).toBe(false)
  })

  it('returns false when all lists are empty', () => {
    expect(isSavedInAnyList([empty], 'listing-a')).toBe(false)
  })

  it('handles multiple lists each containing the same id', () => {
    const dup = list('dup', ['listing-a'])
    expect(isSavedInAnyList([favs, dup], 'listing-a')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getListsContaining
// ---------------------------------------------------------------------------
describe('getListsContaining', () => {
  it('returns the list that contains the listing id', () => {
    const result = getListsContaining([favs, work], 'listing-a')
    expect(result).toHaveLength(1)
    expect(result[0]!.id).toBe('favs')
  })

  it('returns multiple lists when both contain the id', () => {
    const dup = list('dup', ['listing-a'])
    const result = getListsContaining([favs, dup], 'listing-a')
    expect(result).toHaveLength(2)
  })

  it('returns an empty array when no list contains the id', () => {
    expect(getListsContaining([favs, work], 'listing-z')).toHaveLength(0)
  })

  it('returns an empty array for an empty lists input', () => {
    expect(getListsContaining([], 'listing-a')).toHaveLength(0)
  })

  it('does not include lists that do not contain the id', () => {
    const result = getListsContaining([favs, work], 'listing-b')
    expect(result.every((l) => l.id !== 'work')).toBe(true)
  })

  it('returns all lists when each list contains the id', () => {
    const a = list('a', ['listing-x'])
    const b = list('b', ['listing-x'])
    const result = getListsContaining([a, b], 'listing-x')
    expect(result).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// useListStore — initialize and reset
// ---------------------------------------------------------------------------

describe('useListStore', () => {
  beforeEach(() => {
    subscribeMock.mockReset()
    subscribeMock.mockReturnValue(vi.fn()) // returns unsubscribe fn
    // Reset the store to its initial state
    act(() => {
      useListStore.setState({ lists: [], isLoading: false, _unsubscribe: null })
    })
  })

  describe('initialize', () => {
    it('calls listService.subscribe with the given uid', () => {
      act(() => {
        useListStore.getState().initialize('uid-123')
      })
      expect(subscribeMock).toHaveBeenCalledWith('uid-123', expect.any(Function))
    })

    it('sets isLoading to true while subscribing', () => {
      // subscribe returns a fn that never fires the callback
      subscribeMock.mockReturnValue(vi.fn())
      act(() => {
        useListStore.getState().initialize('uid-abc')
      })
      expect(useListStore.getState().isLoading).toBe(true)
    })

    it('stores the unsubscribe function returned by listService.subscribe', () => {
      const unsubFn = vi.fn()
      subscribeMock.mockReturnValue(unsubFn)
      act(() => {
        useListStore.getState().initialize('uid-abc')
      })
      expect(useListStore.getState()._unsubscribe).toBe(unsubFn)
    })

    it('updates lists and sets isLoading=false when the subscription callback fires', () => {
      let capturedCallback: ((lists: ReturnType<typeof list>[]) => void) | null = null
      subscribeMock.mockImplementation((_uid: string, cb: (lists: ReturnType<typeof list>[]) => void) => {
        capturedCallback = cb
        return vi.fn()
      })

      act(() => {
        useListStore.getState().initialize('uid-abc')
      })

      const newLists = [list('list-1', ['p1'])]
      act(() => {
        capturedCallback?.(newLists)
      })

      expect(useListStore.getState().lists).toEqual(newLists)
      expect(useListStore.getState().isLoading).toBe(false)
    })

    it('calls the previous unsubscribe before re-subscribing', () => {
      const firstUnsub = vi.fn()
      subscribeMock.mockReturnValueOnce(firstUnsub)

      act(() => {
        useListStore.getState().initialize('uid-1')
      })

      // Initialize again — should call the first unsubscribe
      subscribeMock.mockReturnValue(vi.fn())
      act(() => {
        useListStore.getState().initialize('uid-2')
      })

      expect(firstUnsub).toHaveBeenCalledOnce()
    })
  })

  describe('reset', () => {
    it('clears lists, isLoading, and _unsubscribe', () => {
      const unsubFn = vi.fn()
      subscribeMock.mockReturnValue(unsubFn)

      act(() => {
        useListStore.getState().initialize('uid-123')
        useListStore.getState().reset()
      })

      const state = useListStore.getState()
      expect(state.lists).toEqual([])
      expect(state.isLoading).toBe(false)
      expect(state._unsubscribe).toBeNull()
    })

    it('calls _unsubscribe during reset', () => {
      const unsubFn = vi.fn()
      subscribeMock.mockReturnValue(unsubFn)

      act(() => {
        useListStore.getState().initialize('uid-123')
        useListStore.getState().reset()
      })

      expect(unsubFn).toHaveBeenCalledOnce()
    })
  })
})
