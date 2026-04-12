import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { boostService } from '@/services/boostService'
import type { BoostTier } from '@/types/boost'

/** Fetches boost tier pricing configuration */
export function useBoostTiers() {
  return useQuery({
    queryKey: ['config', 'boostTiers'],
    queryFn: () => boostService.getBoostTierConfigurations(),
    staleTime: 10 * 60 * 1000, // 10 minutes — config rarely changes
  })
}

/** Fetches all boost payments for a user (payment history) */
export function useUserBoostPayments(userId: string | undefined) {
  return useQuery({
    queryKey: ['payments', 'boost', userId],
    queryFn: () => boostService.getUserBoostPayments(userId!),
    enabled: !!userId,
  })
}

/** Creates a boost payment intent (calls Cloud Function) */
export function useCreateBoostPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      listingId,
      boostTier,
    }: {
      listingId: string
      boostTier: BoostTier
    }) => {
      return boostService.createBoostPaymentIntent(listingId, boostTier)
    },
    onSuccess: () => {
      // Invalidate listings to reflect any changes after payment
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })
}

/** Requests a refund for a boost payment */
export function useRefundBoostPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (paymentId: string) => {
      await boostService.requestRefund(paymentId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })
}

/** Polls for payment completion after Stripe confirms */
export function usePollPaymentCompletion() {
  return useMutation({
    mutationFn: async (paymentId: string): Promise<boolean> => {
      // Poll up to 10 times with 2-second intervals
      for (let i = 0; i < 10; i++) {
        const completed = await boostService.isPaymentCompleted(paymentId)
        if (completed) return true
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
      // Not confirmed within timeout — webhook may be delayed
      return false
    },
  })
}

/** Finds the latest completed boost payment for a listing (for refund eligibility) */
export function useLatestBoostPayment(listingId: string | undefined) {
  return useQuery({
    queryKey: ['payments', 'latestBoost', listingId],
    queryFn: async () => {
      const paymentId = await boostService.getLatestBoostPaymentId(listingId!)
      if (!paymentId) return null
      return boostService.getPaymentById(paymentId)
    },
    enabled: !!listingId,
  })
}
