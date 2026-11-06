import { useQueries } from '@tanstack/react-query'
import { firestoreService } from '@/services/firestoreService'

/**
 * ADR-051: the owner's lifetime Apariciones for each of their listings (an
 * owner-only record per listing). `byId[id]` and `total` stay undefined while
 * anything is loading or failed, so no screen shows a false 0.
 */
export function useListingsApariciones(listingIds: string[]) {
  const results = useQueries({
    queries: listingIds.map((id) => ({
      queryKey: ['listingApariciones', id],
      queryFn: () => firestoreService.getListingApariciones(id),
      staleTime: 60_000,
    })),
  })
  const isLoading = results.some((r) => r.isLoading)
  const isError = results.some((r) => r.isError)
  const byId: Record<string, number | undefined> = {}
  listingIds.forEach((id, i) => {
    byId[id] = results[i]?.data
  })
  const total = isLoading || isError ? undefined : results.reduce((sum, r) => sum + (r.data ?? 0), 0)
  return { byId, total, isLoading, isError }
}
