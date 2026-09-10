// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let getListingWithPropertyMock: Mock

vi.mock('@/services/firestoreService', () => ({
  get firestoreService() {
    return {
      getListingWithProperty: (id: string) => getListingWithPropertyMock(id),
    }
  },
}))

vi.mock('firebase/firestore', () => ({}))
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }))

import { useProperty } from '../useProperty'

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useProperty', () => {
  beforeEach(() => {
    getListingWithPropertyMock = vi.fn()
  })

  it('returns error message when no listingId is provided', () => {
    const { result } = renderHook(() => useProperty(undefined), { wrapper })

    expect(result.current.listing).toBeNull()
    expect(result.current.property).toBeNull()
    expect(result.current.error).toBe('No se proporcionó ID de propiedad')
    expect(result.current.isLoading).toBe(false)
  })

  it('returns listing and property when data is fetched', async () => {
    const mockListing = { id: 'l1', status: 'active' }
    const mockProperty = { id: 'p1' }
    getListingWithPropertyMock.mockResolvedValueOnce({
      listing: mockListing,
      property: mockProperty,
    })

    const { result } = renderHook(() => useProperty('l1'), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.listing).toBe(mockListing)
    expect(result.current.property).toBe(mockProperty)
    expect(result.current.error).toBeNull()
  })

  it('returns "not found" error when data is null (listing does not exist)', async () => {
    getListingWithPropertyMock.mockResolvedValueOnce(null)

    const { result } = renderHook(() => useProperty('l1'), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.listing).toBeNull()
    expect(result.current.error).toBe('Propiedad no encontrada')
  })

  it('returns "not found" for a deactivated listing', async () => {
    getListingWithPropertyMock.mockResolvedValueOnce({
      listing: { id: 'l1', status: 'deactivated' },
      property: { id: 'p1' },
    })

    const { result } = renderHook(() => useProperty('l1'), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('Propiedad no encontrada')
  })

  it('returns error message when the query fails', async () => {
    getListingWithPropertyMock.mockRejectedValueOnce(new Error('permission-denied'))

    const { result } = renderHook(() => useProperty('l1'), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).toBe('Error al cargar la propiedad')
  })

  it('does not call getListingWithProperty when listingId is undefined', () => {
    renderHook(() => useProperty(undefined), { wrapper })

    expect(getListingWithPropertyMock).not.toHaveBeenCalled()
  })
})
