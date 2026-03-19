import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { firestoreService } from '@/services/firestoreService'
import type { ExploreListingsPage } from '@/types/explore'
import type { OperationType } from '@/types/enums'
import type { QueryDocumentSnapshot } from 'firebase/firestore'

const EXPLORE_PAGE_SIZE = 30

export function useExploreListings(operationType?: OperationType | null) {
  // Normalize null to undefined for the query key and service call
  const opType = operationType ?? undefined

  const infiniteQuery = useInfiniteQuery<
    ExploreListingsPage,
    Error,
    { pages: ExploreListingsPage[] },
    (string | undefined)[],
    QueryDocumentSnapshot | undefined
  >({
    queryKey: ['listings', 'explore', opType],
    queryFn: ({ pageParam }) =>
      firestoreService.getActiveListingsWithPropertiesPaginated(
        EXPLORE_PAGE_SIZE,
        pageParam,
        opType,
      ),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.lastDoc : undefined,
  })

  // Flatten all pages into a single array for consumers
  const data = useMemo(
    () => infiniteQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [infiniteQuery.data],
  )

  return {
    data,
    isLoading: infiniteQuery.isLoading,
    error: infiniteQuery.error,
    fetchNextPage: infiniteQuery.fetchNextPage,
    hasNextPage: infiniteQuery.hasNextPage ?? false,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
  }
}
