// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let getAllRealtorApplicationsMock: Mock

vi.mock('@/services/firestoreService', () => ({
  get firestoreService() {
    return {
      getAllRealtorApplications: (status: string) => getAllRealtorApplicationsMock(status),
    }
  },
}))

vi.mock('firebase/firestore', () => ({}))
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }))

import { usePendingRealtorApplicationsCount } from '../useAdmin'

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } },
  })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePendingRealtorApplicationsCount', () => {
  beforeEach(() => {
    getAllRealtorApplicationsMock = vi.fn()
  })

  it('does not fetch when enabled is false', () => {
    const { result } = renderHook(() => usePendingRealtorApplicationsCount(false), { wrapper })

    expect(result.current.isLoading).toBe(false)
    expect(getAllRealtorApplicationsMock).not.toHaveBeenCalled()
  })

  it('fetches when enabled is true', async () => {
    getAllRealtorApplicationsMock.mockResolvedValueOnce([
      { id: 'app-1' },
      { id: 'app-2' },
      { id: 'app-3' },
    ])

    const { result } = renderHook(() => usePendingRealtorApplicationsCount(true), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toBe(3)
  })

  it('returns 0 when there are no pending applications', async () => {
    getAllRealtorApplicationsMock.mockResolvedValueOnce([])

    const { result } = renderHook(() => usePendingRealtorApplicationsCount(true), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.data).toBe(0)
  })

  it('queries with "pending" status', async () => {
    getAllRealtorApplicationsMock.mockResolvedValueOnce([])

    renderHook(() => usePendingRealtorApplicationsCount(true), { wrapper })

    await waitFor(() => expect(getAllRealtorApplicationsMock).toHaveBeenCalledTimes(1))

    expect(getAllRealtorApplicationsMock).toHaveBeenCalledWith('pending')
  })
})
