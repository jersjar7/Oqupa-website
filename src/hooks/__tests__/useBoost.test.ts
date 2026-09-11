// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let getBoostTierConfigurationsMock: Mock
let getUserBoostPaymentsMock: Mock
let createBoostPaymentIntentMock: Mock
let requestRefundMock: Mock
let isPaymentCompletedMock: Mock
let getLatestBoostPaymentIdMock: Mock
let getPaymentByIdMock: Mock

vi.mock('@/services/boostService', () => ({
  get boostService() {
    return {
      getBoostTierConfigurations: () => getBoostTierConfigurationsMock(),
      getUserBoostPayments: (id: string) => getUserBoostPaymentsMock(id),
      createBoostPaymentIntent: (listingId: string, boostTier: unknown) =>
        createBoostPaymentIntentMock(listingId, boostTier),
      requestRefund: (paymentId: string) => requestRefundMock(paymentId),
      isPaymentCompleted: (paymentId: string) => isPaymentCompletedMock(paymentId),
      getLatestBoostPaymentId: (listingId: string) => getLatestBoostPaymentIdMock(listingId),
      getPaymentById: (paymentId: string) => getPaymentByIdMock(paymentId),
    }
  },
}))

vi.mock('firebase/firestore', () => ({}))
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }))

import {
  useBoostTiers,
  useUserBoostPayments,
  useCreateBoostPayment,
  useRefundBoostPayment,
  usePollPaymentCompletion,
  useLatestBoostPayment,
} from '../useBoost'

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useBoost hooks', () => {
  beforeEach(() => {
    getBoostTierConfigurationsMock = vi.fn()
    getUserBoostPaymentsMock = vi.fn()
    createBoostPaymentIntentMock = vi.fn()
    requestRefundMock = vi.fn()
    isPaymentCompletedMock = vi.fn()
    getLatestBoostPaymentIdMock = vi.fn()
    getPaymentByIdMock = vi.fn()
  })

  describe('useBoostTiers', () => {
    it('fetches boost tier configurations on mount', async () => {
      const tiers = [{ id: 'basic', price: 9.9 }]
      getBoostTierConfigurationsMock.mockResolvedValueOnce(tiers)

      const { result } = renderHook(() => useBoostTiers(), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.data).toBe(tiers)
      expect(getBoostTierConfigurationsMock).toHaveBeenCalled()
    })
  })

  describe('useUserBoostPayments', () => {
    it('does not fetch when userId is undefined', () => {
      const { result } = renderHook(() => useUserBoostPayments(undefined), { wrapper })

      expect(result.current.isLoading).toBe(false)
      expect(getUserBoostPaymentsMock).not.toHaveBeenCalled()
    })

    it('fetches when userId is provided', async () => {
      const payments = [{ id: 'pay-1' }]
      getUserBoostPaymentsMock.mockResolvedValueOnce(payments)

      const { result } = renderHook(() => useUserBoostPayments('user-1'), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.data).toBe(payments)
    })
  })

  describe('useCreateBoostPayment', () => {
    it('calls createBoostPaymentIntent with correct params', async () => {
      const mockResult = { clientSecret: 'cs_test' }
      createBoostPaymentIntentMock.mockResolvedValueOnce(mockResult)

      const { result } = renderHook(() => useCreateBoostPayment(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({ listingId: 'l1', boostTier: { id: 'basic' } as never })
      })

      expect(createBoostPaymentIntentMock).toHaveBeenCalledWith('l1', { id: 'basic' })
    })
  })

  describe('useRefundBoostPayment', () => {
    it('calls requestRefund with the payment id', async () => {
      requestRefundMock.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useRefundBoostPayment(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync('pay-1')
      })

      expect(requestRefundMock).toHaveBeenCalledWith('pay-1')
    })
  })

  describe('usePollPaymentCompletion', () => {
    it('returns true when payment is completed on first poll', async () => {
      isPaymentCompletedMock.mockResolvedValueOnce(true)

      const { result } = renderHook(() => usePollPaymentCompletion(), { wrapper })

      let pollResult: boolean | undefined
      await act(async () => {
        pollResult = await result.current.mutateAsync('pay-1')
      })

      expect(pollResult).toBe(true)
      expect(isPaymentCompletedMock).toHaveBeenCalledTimes(1)
    })

    it('returns false when payment is never completed within 10 polls', async () => {
      vi.useFakeTimers()
      isPaymentCompletedMock.mockResolvedValue(false)

      const { result } = renderHook(() => usePollPaymentCompletion(), { wrapper })

      let pollResult: boolean | undefined
      const mutationPromise = act(async () => {
        const promise = result.current.mutateAsync('pay-1')
        // Advance timers to skip the 2-second waits
        for (let i = 0; i < 10; i++) {
          await vi.advanceTimersByTimeAsync(2100)
        }
        pollResult = await promise
      })

      await mutationPromise
      expect(pollResult).toBe(false)
      vi.useRealTimers()
    })
  })

  describe('useLatestBoostPayment', () => {
    it('does not fetch when listingId is undefined', () => {
      const { result } = renderHook(() => useLatestBoostPayment(undefined), { wrapper })

      expect(result.current.isLoading).toBe(false)
      expect(getLatestBoostPaymentIdMock).not.toHaveBeenCalled()
    })

    it('returns null when no payment id is found', async () => {
      getLatestBoostPaymentIdMock.mockResolvedValueOnce(null)

      const { result } = renderHook(() => useLatestBoostPayment('l1'), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.data).toBeNull()
      expect(getPaymentByIdMock).not.toHaveBeenCalled()
    })

    it('fetches payment details when a payment id is found', async () => {
      const payment = { id: 'pay-1', amount: 9.9 }
      getLatestBoostPaymentIdMock.mockResolvedValueOnce('pay-1')
      getPaymentByIdMock.mockResolvedValueOnce(payment)

      const { result } = renderHook(() => useLatestBoostPayment('l1'), { wrapper })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.data).toBe(payment)
      expect(getPaymentByIdMock).toHaveBeenCalledWith('pay-1')
    })
  })
})
