import { useQuery } from '@tanstack/react-query'
import { firestoreService } from '@/services/firestoreService'

export function useExploreListings() {
  return useQuery({
    queryKey: ['explore-listings'],
    queryFn: () => firestoreService.getActiveListingsWithProperties(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
