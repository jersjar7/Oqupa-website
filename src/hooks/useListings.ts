import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { firestoreService } from '@/services/firestoreService'
import type { Listing } from '@/types/listing'

export function useListingDetails(listingId: string | undefined) {
  return useQuery({
    queryKey: ['listings', 'detail', listingId],
    queryFn: () => firestoreService.getListingWithProperty(listingId!),
    enabled: !!listingId,
  })
}

export function useUserListingsWithProperties(userId: string | undefined) {
  return useQuery({
    queryKey: ['listings', 'user', userId, 'withProperties'],
    queryFn: () => firestoreService.getUserListingsWithProperties(userId!),
    enabled: !!userId,
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
      return currentStatus
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      toast.success(
        variables.currentStatus === 'active'
          ? 'Publicacion desactivada'
          : 'Publicacion activada'
      )
    },
    onError: () => {
      toast.error('Error al cambiar el estado de la publicacion')
    },
  })
}

export function useDeleteListing() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      listingId,
      propertyId,
    }: {
      listingId: string
      propertyId: string
    }) => {
      await firestoreService.deleteListing(listingId)
      await firestoreService.deleteProperty(propertyId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      toast.success('Publicacion eliminada')
    },
    onError: () => {
      toast.error('Error al eliminar la publicacion')
    },
  })
}
