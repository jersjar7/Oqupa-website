// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// ADR-051: an owner's Apariciones per listing. A listing with no record is 0
// (nobody has seen it yet); a failed read is unknown, never 0.

const getOwnerApariciones = vi.fn()
vi.mock('@/services/firestoreService', () => ({
  firestoreService: { getOwnerApariciones: (...a: unknown[]) => getOwnerApariciones(...a) },
}))

const { useListingsApariciones, aparicionesFor } = await import('../useListingApariciones')

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => getOwnerApariciones.mockReset())

describe('useListingsApariciones', () => {
  it('listings without a record are 0; the total adds up the listings asked for', async () => {
    getOwnerApariciones.mockResolvedValue({ L1: 210, OTHER: 99 })
    const { result } = renderHook(() => useListingsApariciones(['L1', 'L2'], 'owner-1'), { wrapper })
    await waitFor(() => expect(result.current.total).toBe(210))
    expect(result.current.byId).toEqual({ L1: 210, L2: 0 })
  })

  it('asks nothing when there is no owner or no listing (a visitor\'s page)', () => {
    renderHook(() => useListingsApariciones([], undefined), { wrapper })
    renderHook(() => useListingsApariciones(['L1'], undefined), { wrapper })
    expect(getOwnerApariciones).not.toHaveBeenCalled()
  })
})

describe('aparicionesFor', () => {
  it('a failed read leaves every number unknown, even with old data', () => {
    const r = aparicionesFor(['L1'], { enabled: true, data: { L1: 5 }, isLoading: false, isError: true })
    expect(r.total).toBeUndefined()
    expect(r.byId.L1).toBeUndefined()
    expect(r.isError).toBe(true)
  })

  it('while loading, unknown', () => {
    const r = aparicionesFor(['L1'], { enabled: true, data: undefined, isLoading: true, isError: false })
    expect(r.total).toBeUndefined()
  })

  it('an owner with no listings has 0', () => {
    expect(aparicionesFor([], { enabled: false, data: undefined, isLoading: false, isError: false }).total).toBe(0)
  })
})
