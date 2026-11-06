import { useQuery } from '@tanstack/react-query'
import { firestoreService } from '@/services/firestoreService'

/**
 * ADR-051: the owner's lifetime Apariciones for the given listings, read in one
 * query by owner (the record is owner-only). A listing with no record is 0
 * (nobody has seen it yet). While loading or after a failed read, `byId` and
 * `total` stay undefined, so no screen shows a false 0. With no owner or no
 * listings (a visitor's page) nothing is asked.
 */
export function useListingsApariciones(listingIds: string[], ownerId: string | undefined) {
  const enabled = !!ownerId && listingIds.length > 0
  const q = useQuery({
    queryKey: ['ownerApariciones', ownerId],
    queryFn: () => firestoreService.getOwnerApariciones(ownerId!),
    enabled,
    staleTime: 60_000,
  })
  return aparicionesFor(listingIds, { enabled, data: q.data, isLoading: q.isLoading, isError: q.isError })
}

/** The numbers a screen may show, from the owner's query state. */
export function aparicionesFor(
  listingIds: string[],
  q: { enabled: boolean; data: Record<string, number> | undefined; isLoading: boolean; isError: boolean },
) {
  const known = q.enabled && !q.isError && q.data !== undefined
  const byId: Record<string, number | undefined> = {}
  for (const id of listingIds) byId[id] = known ? (q.data![id] ?? 0) : undefined
  const total = known ? listingIds.reduce((sum, id) => sum + (q.data![id] ?? 0), 0) : q.enabled ? undefined : 0
  return { byId, total, isLoading: q.enabled && q.isLoading, isError: q.enabled && q.isError }
}
