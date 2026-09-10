// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let getListingWithPropertyMock: Mock
let getUserListingsWithPropertiesMock: Mock
let deactivateListingMock: Mock
let activateListingMock: Mock
let deleteListingMock: Mock
let deletePropertyMock: Mock

vi.mock('@/services/firestoreService', () => ({
  get firestoreService() {
    return {
      getListingWithProperty: (id: string) => getListingWithPropertyMock(id),
      getUserListingsWithProperties: (userId: string) => getUserListingsWithPropertiesMock(userId),
      deactivateListing: (id: string) => deactivateListingMock(id),
      activateListing: (id: string) => activateListingMock(id),
      deleteListing: (id: string) => deleteListingMock(id),
      deleteProperty: (id: string) => deletePropertyMock(id),
    }
  },
}))

vi.mock('firebase/firestore', () => ({}))
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }))

const toastSuccessMock = vi.fn()
const toastErrorMock = vi.fn()
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}))

import { useListingDetails, useUserListingsWithProperties, useToggleListingStatus, useDeleteListing } from '../useListings'

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useListings hooks', () => {
  beforeEach(() => {
    getListingWithPropertyMock = vi.fn()
    getUserListingsWithPropertiesMock = vi.fn()
    deactivateListingMock = vi.fn()
    activateListingMock = vi.fn()
    deleteListingMock = vi.fn()
    deletePropertyMock = vi.fn()
    toastSuccessMock.mockClear()
    toastErrorMock.mockClear()
  })

  describe('useListingDetails', () => {
    it('does not fetch when listingId is undefined', () => {
      const { result } = renderHook(() => useListingDetails(undefined), { wrapper })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toBeUndefined()
      expect(getListingWithPropertyMock).not.toHaveBeenCalled()
    })

    it('fetches when listingId is provided', async () => {
      const mockData = { listing: { id: 'l1' }, property: {} }
      getListingWithPropertyMock.mockResolvedValueOnce(mockData)

      const { result } = renderHook(() => useListingDetails('l1'), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.data).toBe(mockData)
      expect(getListingWithPropertyMock).toHaveBeenCalledWith('l1')
    })
  })

  describe('useUserListingsWithProperties', () => {
    it('does not fetch when userId is undefined', () => {
      const { result } = renderHook(() => useUserListingsWithProperties(undefined), { wrapper })

      expect(result.current.isLoading).toBe(false)
      expect(getUserListingsWithPropertiesMock).not.toHaveBeenCalled()
    })

    it('fetches when userId is provided', async () => {
      const mockListings = [{ listing: { id: 'l1' } }]
      getUserListingsWithPropertiesMock.mockResolvedValueOnce(mockListings)

      const { result } = renderHook(() => useUserListingsWithProperties('user-1'), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.data).toBe(mockListings)
    })
  })

  describe('useToggleListingStatus', () => {
    it('calls deactivateListing when currentStatus is active', async () => {
      deactivateListingMock.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useToggleListingStatus(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ listingId: 'l1', currentStatus: 'active' })
      })

      expect(deactivateListingMock).toHaveBeenCalledWith('l1')
      expect(activateListingMock).not.toHaveBeenCalled()
    })

    it('calls activateListing when currentStatus is not active', async () => {
      activateListingMock.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useToggleListingStatus(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ listingId: 'l1', currentStatus: 'expired' })
      })

      expect(activateListingMock).toHaveBeenCalledWith('l1')
      expect(deactivateListingMock).not.toHaveBeenCalled()
    })

    it('shows success toast after deactivating', async () => {
      deactivateListingMock.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useToggleListingStatus(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ listingId: 'l1', currentStatus: 'active' })
      })

      expect(toastSuccessMock).toHaveBeenCalledWith('Publicacion desactivada')
    })

    it('shows success toast after activating', async () => {
      activateListingMock.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useToggleListingStatus(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ listingId: 'l1', currentStatus: 'draft' })
      })

      expect(toastSuccessMock).toHaveBeenCalledWith('Publicacion activada')
    })

    it('shows error toast on failure', async () => {
      deactivateListingMock.mockRejectedValueOnce(new Error('network error'))

      const { result } = renderHook(() => useToggleListingStatus(), { wrapper })

      await act(async () => {
        try {
          await result.current.mutateAsync({ listingId: 'l1', currentStatus: 'active' })
        } catch {
          // expected
        }
      })

      expect(toastErrorMock).toHaveBeenCalled()
    })
  })

  describe('useDeleteListing', () => {
    it('calls deleteListing and deleteProperty', async () => {
      deleteListingMock.mockResolvedValueOnce(undefined)
      deletePropertyMock.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteListing(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ listingId: 'l1', propertyId: 'p1' })
      })

      expect(deleteListingMock).toHaveBeenCalledWith('l1')
      expect(deletePropertyMock).toHaveBeenCalledWith('p1')
    })

    it('shows success toast after deleting', async () => {
      deleteListingMock.mockResolvedValueOnce(undefined)
      deletePropertyMock.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useDeleteListing(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ listingId: 'l1', propertyId: 'p1' })
      })

      expect(toastSuccessMock).toHaveBeenCalledWith('Publicacion eliminada')
    })

    it('shows error toast on failure', async () => {
      deleteListingMock.mockRejectedValueOnce(new Error('forbidden'))

      const { result } = renderHook(() => useDeleteListing(), { wrapper })

      await act(async () => {
        try {
          await result.current.mutateAsync({ listingId: 'l1', propertyId: 'p1' })
        } catch {
          // expected
        }
      })

      expect(toastErrorMock).toHaveBeenCalled()
    })
  })
})
