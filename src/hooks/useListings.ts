import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { firestoreService } from '@/services/firestoreService'
import type { Listing } from '@/types/listing'

export function useUserListings(userId: string | undefined) {
  return useQuery({
    queryKey: ['listings', 'user', userId],
    queryFn: () => firestoreService.getUserListings(userId!),
    enabled: !!userId,
  })
}

export function useListingDetails(listingId: string | undefined) {
  return useQuery({
    queryKey: ['listings', 'detail', listingId],
    queryFn: () => firestoreService.getListingWithProperty(listingId!),
    enabled: !!listingId,
  })
}

export function useToggleListingStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      listingId,
      currentStatus,
    }: {
      listingId: string
      currentStatus: Listing['status']
    }) => {
      if (currentStatus === 'active') {
        await firestoreService.deactivateListing(listingId)
      } else {
        await firestoreService.activateListing(listingId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
    },
  })
}
