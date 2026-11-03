import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { boostService } from '@/services/boostService'
import { invalidateListingQueries } from '@/lib/listingQueries'
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
    // Nothing about the listing changes yet: the screens refresh when the
    // payment is confirmed (usePollPaymentCompletion), not here.
  })
}

/** Requests a refund for a boost payment */
export function useRefundBoostPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (paymentId: string) => {
      await boostService.requestRefund(paymentId)
    },
    // The function takes the days off before it returns, so the refetch reads
    // the listing unboosted.
    onSuccess: () => {
      void refreshAfterBoostChange(queryClient)
    },
  })
}

/** A boost was bought or refunded: the listing screens and the payments. */
function refreshAfterBoostChange(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    invalidateListingQueries(queryClient),
    queryClient.invalidateQueries({ queryKey: ['payments'] }),
  ])
}

/** Payments still being watched after the purchase flow's own wait ran out. */
const watchedPayments = new Set<string>()

/** How long a late confirmation is still watched for, after the first 20 s. */
export const LATE_CONFIRMATION_WATCH = { intervalMs: 5000, attempts: 60 } // 5 minutes

/**
 * The webhook can land after the flow's 20-second wait. Keep checking in the
 * background — outside any component, so closing the dialog or leaving the
 * page does not stop it — and refresh the screens the moment it lands.
 */
function watchLateBoostConfirmation(queryClient: QueryClient, paymentId: string) {
  if (!paymentId || watchedPayments.has(paymentId)) return
  watchedPayments.add(paymentId)
  void (async () => {
    try {
      for (let i = 0; i < LATE_CONFIRMATION_WATCH.attempts; i++) {
        await new Promise((resolve) => setTimeout(resolve, LATE_CONFIRMATION_WATCH.intervalMs))
        if (await boostService.isPaymentCompleted(paymentId)) {
          await refreshAfterBoostChange(queryClient)
          return
        }
      }
    } finally {
      watchedPayments.delete(paymentId)
    }
  })()
}

/**
 * Polls for payment completion after Stripe confirms. Once the server has
 * confirmed it, the owner's cards, the explore map and list and the listing
 * page refresh — from the server's state, never from a guess.
 */
export function usePollPaymentCompletion() {
  const queryClient = useQueryClient()

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
    onSuccess: (confirmed, paymentId) => {
      if (confirmed) void refreshAfterBoostChange(queryClient)
      else watchLateBoostConfirmation(queryClient, paymentId)
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
