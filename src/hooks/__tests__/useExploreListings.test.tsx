// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * The explore map draws whatever this hook has loaded, so "loaded" has to mean
 * "all of it".
 *
 * On 2026-08-04 production had 47 active listings and the Todos tab drew 30 —
 * **36% of the catalogue invisible**. Pages loaded 30 at a time and the next
 * page only arrived when someone scrolled the LIST panel; people using a map
 * pan and zoom instead. Ordering is newest-first, so the properties that fell
 * off were the oldest ones — the sellers who had been waiting longest were the
 * least visible.
 *
 * It was invisible until inventory passed 30, which means it got worse exactly
 * as supply recruitment succeeded.
 */
const mockGet = vi.fn()
vi.mock('@/services/firestoreService', () => ({
  firestoreService: {
    getActiveListingsWithPropertiesPaginated: (...args: unknown[]) => mockGet(...args),
  },
}))

import { useExploreListings } from '../useExploreListings'

/** A page of `n` fake listings, with a cursor when more remain. */
function page(ids: number[], hasMore: boolean) {
  return {
    items: ids.map((i) => ({ listing: { id: `listing-${i}` }, property: {} })),
    lastDoc: hasMore ? ({ id: `cursor-${ids[ids.length - 1]}` } as never) : undefined,
    hasMore,
  }
}

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

beforeEach(() => mockGet.mockReset())

describe('the map gets the whole catalogue, not the first page', () => {
  it('keeps loading until there are no more pages', async () => {
    // Production shape on the day: 47 active listings, 30 per page.
    mockGet
      .mockResolvedValueOnce(page(range(1, 30), true))
      .mockResolvedValueOnce(page(range(31, 47), false))

    const { result } = renderHook(() => useExploreListings(), { wrapper })

    await waitFor(() => expect(result.current.data).toHaveLength(47))
    expect(mockGet).toHaveBeenCalledTimes(2)
    expect(result.current.hasNextPage).toBe(false)
    expect(result.current.hitPageCeiling).toBe(false)
  })

  it('includes the OLDEST listings, which are the ones that were dropped', async () => {
    mockGet
      .mockResolvedValueOnce(page(range(1, 30), true))
      .mockResolvedValueOnce(page(range(31, 47), false))

    const { result } = renderHook(() => useExploreListings(), { wrapper })

    await waitFor(() => expect(result.current.data).toHaveLength(47))
    const ids = result.current.data.map((d: { listing: { id: string } }) => d.listing.id)
    // #47 sorts last by publishedAt — Roberto's and Cesa's April properties.
    expect(ids).toContain('listing-47')
    expect(ids).toContain('listing-31')
  })

  it('does not make a second request when everything fits in one page', async () => {
    mockGet.mockResolvedValueOnce(page(range(1, 11), false))

    const { result } = renderHook(() => useExploreListings(), { wrapper })

    await waitFor(() => expect(result.current.data).toHaveLength(11))
    expect(mockGet).toHaveBeenCalledTimes(1)
  })

  it('does not fire a third fetchNextPage call while page 2 is loading (isFetchingNextPage guard)', async () => {
    // Page 1 resolves immediately with a cursor; page 2 is deferred so isFetchingNextPage
    // stays true long enough for the effect to re-run and hit the guard branch.
    let resolvePage2!: (value: ReturnType<typeof page>) => void
    const page2Promise = new Promise<ReturnType<typeof page>>((resolve) => {
      resolvePage2 = resolve
    })

    mockGet
      .mockResolvedValueOnce(page(range(1, 30), true))
      .mockReturnValueOnce(page2Promise)

    const { result } = renderHook(() => useExploreListings(), { wrapper })

    // Wait until page 1 has loaded and the page-2 request is in flight
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2))

    // While page 2 is pending (isFetchingNextPage=true), the guard prevents a third call
    expect(mockGet).toHaveBeenCalledTimes(2)

    // Resolve page 2 — loading continues normally
    resolvePage2(page(range(31, 47), false))
    await waitFor(() => expect(result.current.data).toHaveLength(47))
    expect(mockGet).toHaveBeenCalledTimes(2)
  })
})

describe('the ceiling is surfaced, never silent', () => {
  it('stops at the cap and says so, rather than presenting a partial catalogue as whole', async () => {
    // Every page claims more remain — the shape of a catalogue that has
    // outgrown load-everything and needs viewport queries instead.
    mockGet.mockResolvedValue(page(range(1, 30), true))

    const { result } = renderHook(() => useExploreListings(), { wrapper })

    await waitFor(() => expect(result.current.hitPageCeiling).toBe(true))
    // Bounded: it does not spin forever making requests.
    expect(mockGet.mock.calls.length).toBeLessThanOrEqual(10)
    expect(result.current.hasNextPage).toBe(true)
  })
})
