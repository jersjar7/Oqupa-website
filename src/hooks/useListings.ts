import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { firestoreService } from '@/services/firestoreService'
import type { Listing } from '@/types/listing'
import { firestoreWriteErrorMessage } from '@/lib/friendlyErrors'
import { AGENTS_WHEN_TURNED_ON } from '@/lib/agentHelp'
import { invalidateListingQueries, listingQueryKeys } from '@/lib/listingQueries'

export function useListingDetails(listingId: string | undefined) {
  return useQuery({
    queryKey: listingQueryKeys.detail(listingId),
    queryFn: () => firestoreService.getListingWithProperty(listingId!),
    enabled: !!listingId,
  })
}

export function useUserListingsWithProperties(userId: string | undefined) {
  return useQuery({
    queryKey: listingQueryKeys.owner(userId),
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
      void invalidateListingQueries(queryClient, variables.listingId)
      toast.success(
        variables.currentStatus === 'active'
          ? 'Publicación desactivada'
          : 'Tu publicación está activa otra vez'
      )
    },
    onError: (error) => {
      toast.error(firestoreWriteErrorMessage(error))
    },
  })
}

/**
 * Marks a listing Vendido or Alquilado — the website's copy of the app's
 * owner action. The close survey opens from the caller's onSuccess.
 */
export function useMarkListingClosed() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ listingId, status }: { listingId: string; status: 'sold' | 'rented' }) => {
      await firestoreService.updateListingStatus(listingId, status)
    },
    onSuccess: (_data, variables) => {
      void invalidateListingQueries(queryClient, variables.listingId)
      toast.success(
        variables.status === 'rented' ? 'Propiedad marcada como alquilada' : 'Propiedad marcada como vendida'
      )
    },
    onError: (error) => {
      toast.error(firestoreWriteErrorMessage(error))
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
    onSuccess: (_data, variables) => {
      void invalidateListingQueries(queryClient, variables.listingId)
      toast.success('Publicación eliminada')
    },
    onError: (error) => {
      toast.error(firestoreWriteErrorMessage(error))
    },
  })
}

/**
 * Agent help, turned on or off by the owner from Mis Propiedades (ADR-043
 * D10: it left the publishing wizard). Only the switch is written; the
 * listing keeps its maximum of agents.
 */
export function useSetRealtorHelp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ listingId, on }: { listingId: string; on: boolean }) => {
      // Turning on writes the number the offer quotes, as the app does.
      await firestoreService.updateListing(
        listingId,
        on ? { wantsRealtorHelp: true, maxRealtors: AGENTS_WHEN_TURNED_ON } : { wantsRealtorHelp: false },
      )
    },
    onSuccess: (_data, variables) => {
      void invalidateListingQueries(queryClient, variables.listingId)
      toast.success(variables.on ? 'Ayuda de agentes activada' : 'Ayuda de agentes desactivada')
    },
    onError: (error) => {
      toast.error(firestoreWriteErrorMessage(error))
    },
  })
}
