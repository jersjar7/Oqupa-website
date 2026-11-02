import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { firestoreService } from '@/services/firestoreService'
import { useAuthStore } from '@/stores/authStore'
import { OFFLINE_MESSAGE, isOfflineError } from '@/lib/friendlyErrors'

/** A failed accept / decline / invite / remove: the cause and the next step
 *  (audit 2026-11-02, section G); `fallback` for anything unrecognised. */
function agentActionError(error: unknown, fallback: string): string {
  if (isOfflineError(error)) return OFFLINE_MESSAGE
  const code = (error as { code?: unknown } | null)?.code
  if (code === 'permission-denied' || code === 'not-found') {
    return 'Esta publicación cambió o ya no está disponible. Actualiza la página.'
  }
  return fallback
}

export function useAgentAssignments(agentId: string | undefined) {
  return useQuery({
    queryKey: ['leads', 'agent-assignments', agentId],
    queryFn: () => firestoreService.getAgentAssignedListingsWithProperties(agentId!),
    enabled: !!agentId,
  })
}

export function useAvailableLeads(enabled: boolean) {
  const user = useAuthStore((s) => s.user)
  return useQuery({
    queryKey: ['leads', 'available', user?.id],
    queryFn: () => firestoreService.getAvailableLeads(user?.id),
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
      toast.success('Propiedad reclamada exitosamente')
    },
    onError: (error) => {
      // Refresh either way: a listing that just filled must stop offering
      // RECLAMAR (audit 2026-11-02).
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      // createRealtorClaim rethrows the CF's Spanish message (full / already
      // claimed / monthly limit / not verified); show it verbatim.
      toast.error(
        error instanceof Error
          ? error.message
          : 'Error al reclamar la propiedad',
      )
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
      /** For the toast only. */
      realtorName?: string
    }) => firestoreService.assignRealtorToListing(data.listingId, data.realtorId, data.realtorPhone),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      // It sends an invitation; the agent still has to accept it.
      toast.success(vars.realtorName ? `Invitación enviada a ${vars.realtorName}.` : 'Invitación enviada.')
    },
    onError: (error) => {
      toast.error(agentActionError(error, 'Error al asignar el agente'))
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
      toast.success('Agente removido')
    },
    onError: (error) => {
      toast.error(agentActionError(error, 'Error al quitar el agente'))
    },
  })
}

export function useAcceptAssignment() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (listingId: string) => firestoreService.acceptAssignment(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      queryClient.invalidateQueries({ queryKey: ['listings'] })
      // The card now moves pages — surface where it went so agents don't
      // wonder if they lost it.
      toast.success('¡Invitación aceptada!', {
        description: 'Ahora gestionas esta propiedad.',
        action: {
          label: 'Ver en Asignadas',
          onClick: () => navigate('/app/listings?tab=asignadas'),
        },
        duration: 8000,
      })
    },
    onError: (error) => {
      toast.error(agentActionError(error, 'Error al aceptar la invitación'))
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
      toast.success('Asignación rechazada')
    },
    onError: (error) => {
      toast.error(agentActionError(error, 'Error al rechazar la asignación'))
    },
  })
}
