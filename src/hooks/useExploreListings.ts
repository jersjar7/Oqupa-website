import { useQuery } from '@tanstack/react-query'
import { firestoreService } from '@/services/firestoreService'

export function useExploreListings() {
  return useQuery({
    queryKey: ['listings', 'explore'],
    queryFn: () => firestoreService.getActiveListingsWithProperties(),
  })
}
