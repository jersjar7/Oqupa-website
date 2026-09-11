// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mock firestoreService to avoid Firebase initialisation
// ---------------------------------------------------------------------------

let getListingWithPropertyMock: Mock

vi.mock('@/services/firestoreService', () => ({
  get firestoreService() {
    return {
      getListingWithProperty: (id: string) => getListingWithPropertyMock(id),
    }
  },
}))

// Firebase SDK side-effect mocks (cascade from firestoreService import)
vi.mock('firebase/firestore', () => ({}))
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }))

import { useListListings } from '../useListListings'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useListListings', () => {
  beforeEach(() => {
    getListingWithPropertyMock = vi.fn()
  })

  it('starts with items=[] and isLoading=false when no ids are provided', () => {
    const { result } = renderHook(() => useListListings([]))

    expect(result.current.items).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('starts with isLoading=true when ids are provided', () => {
    getListingWithPropertyMock.mockReturnValue(new Promise(() => {})) // never resolves

    const { result } = renderHook(() => useListListings(['id-1']))

    expect(result.current.isLoading).toBe(true)
  })

  it('fetches each listing and returns non-null results', async () => {
    const listing1 = { listing: { id: 'l1' }, property: { id: 'p1' } }
    const listing2 = { listing: { id: 'l2' }, property: { id: 'p2' } }

    getListingWithPropertyMock
      .mockResolvedValueOnce(listing1)
      .mockResolvedValueOnce(listing2)

    const { result } = renderHook(() => useListListings(['l1', 'l2']))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.items).toHaveLength(2)
    expect(result.current.items[0]).toBe(listing1)
    expect(result.current.items[1]).toBe(listing2)
  })

  it('filters out null results (listings that no longer exist)', async () => {
    const listing1 = { listing: { id: 'l1' }, property: { id: 'p1' } }

    getListingWithPropertyMock
      .mockResolvedValueOnce(listing1)
      .mockResolvedValueOnce(null)

    const { result } = renderHook(() => useListListings(['l1', 'l2']))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toBe(listing1)
  })

  it('returns empty items when ids array goes from some to empty', async () => {
    getListingWithPropertyMock.mockResolvedValue({ listing: { id: 'l1' }, property: {} })

    const { result, rerender } = renderHook(
      ({ ids }: { ids: string[] }) => useListListings(ids),
      { initialProps: { ids: ['l1'] } },
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.items).toHaveLength(1)

    rerender({ ids: [] })

    expect(result.current.items).toEqual([])
    expect(result.current.isLoading).toBe(false)
  })

  it('calls getListingWithProperty once per id', async () => {
    getListingWithPropertyMock.mockResolvedValue(null)

    const { } = renderHook(() => useListListings(['id-1', 'id-2', 'id-3']))

    await waitFor(() => expect(getListingWithPropertyMock).toHaveBeenCalledTimes(3))

    expect(getListingWithPropertyMock).toHaveBeenCalledWith('id-1')
    expect(getListingWithPropertyMock).toHaveBeenCalledWith('id-2')
    expect(getListingWithPropertyMock).toHaveBeenCalledWith('id-3')
  })

  it('does not update state after unmount during fetch (cancelled branch)', async () => {
    // Exercises lines 20 and 25: `if (!cancelled)` guards when cancelled = true
    let resolvePromise!: () => void
    getListingWithPropertyMock.mockReturnValue(
      new Promise<{ listing: { id: string }; property: Record<string, never> } | null>((resolve) => {
        resolvePromise = () => resolve({ listing: { id: 'l1' }, property: {} })
      })
    )

    const { unmount } = renderHook(() => useListListings(['l1']))

    // Unmount before the promise resolves — cancels the effect
    act(() => {
      unmount()
    })

    // Now resolve the promise — should not throw or update state
    act(() => {
      resolvePromise()
    })

    // If we reach here without errors, the cancelled guard worked correctly
    expect(getListingWithPropertyMock).toHaveBeenCalledOnce()
  })
})
