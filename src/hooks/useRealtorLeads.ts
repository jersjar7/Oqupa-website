import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { firestoreService } from '@/services/firestoreService'
import { useAuthStore } from '@/stores/authStore'

export function useAgentAssignments(agentId: string | undefined) {
  return useQuery({
    queryKey: ['leads', 'agent-assignments', agentId],
    queryFn: () => firestoreService.getAgentAssignedListingsWithProperties(agentId!),
    enabled: !!agentId,
  })
}

export function useAvailableLeads(enabled: boolean) {
  return useQuery({
    queryKey: ['leads', 'available'],
    queryFn: () => firestoreService.getAvailableLeads(),
    enabled,
  })
}

export function useClaimedLeads(realtorId: string | undefined) {
  return useQuery({
    queryKey: ['leads', 'claimed', realtorId],
    queryFn: () => firestoreService.getClaimedLeadsWithDetails(realtorId!),
    enabled: !!realtorId,
  })
}

export function useListingClaims(listingOwnerId: string | undefined, listingId: string | undefined) {
  return useQuery({
    queryKey: ['leads', 'listing-claims', listingId],
    queryFn: () => firestoreService.getClaimsForListing(listingOwnerId!, listingId!),
    enabled: !!listingOwnerId && !!listingId,
  })
}

export function useClaimStatus() {
  const user = useAuthStore((s) => s.user)
  if (!user) return { canClaim: false, remaining: 0, limit: 5 }
  return firestoreService.getClaimStatus(user)
}

export function useClaimLead() {
  const queryClient = useQueryClient()
  const refreshUser = useAuthStore((s) => s.refreshUser)

  return useMutation({
    mutationFn: (data: {
      listingId: string
      realtorId: string
      listingOwnerId: string
      realtorName: string
      realtorPhone: string
      realtorBusinessName: string
    }) => firestoreService.createRealtorClaim(data),
    onSuccess: async () => {
      await refreshUser()
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })
}

export function useAssignRealtor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      listingId: string
      realtorId: string
      realtorPhone: string
    }) => firestoreService.assignRealtorToListing(data.listingId, data.realtorId, data.realtorPhone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })
}

export function useUnassignRealtor() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (listingId: string) => firestoreService.unassignRealtor(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })
}

export function useAcceptAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (listingId: string) => firestoreService.acceptAssignment(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })
}

export function useDeclineAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      listingId: string
      currentDeclinedIds: string[]
      agentId: string
    }) => firestoreService.declineAssignment(data.listingId, data.currentDeclinedIds, data.agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })
}
