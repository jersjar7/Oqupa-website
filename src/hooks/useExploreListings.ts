import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { firestoreService } from '@/services/firestoreService'
import type { ExploreListingsPage } from '@/types/explore'
import type { OperationType } from '@/types/enums'
import type { QueryDocumentSnapshot } from 'firebase/firestore'

const EXPLORE_PAGE_SIZE = 30

/**
 * Hard ceiling on how many pages we will pull in before stopping.
 *
 * The map draws whatever this hook has loaded, so a half-loaded hook is a map
 * that quietly omits properties. On 2026-08-04, with 47 active listings, the
 * "Todos" tab drew 30 of them — **36% of the catalogue invisible** — because
 * more pages only loaded when someone scrolled the LIST, and people using a
 * map pan and zoom instead of scrolling. The listings that fell off were the
 * oldest ones, so the sellers waiting longest were the least visible.
 *
 * This is a stopgap sized for Piura. It stops being the right design at a few
 * hundred listings, where the answer is to query by map viewport instead of
 * loading everything. When that day comes the ceiling below will be hit and
 * `hitPageCeiling` goes true — which is deliberately surfaced rather than
 * silently truncating, because a silent cap is the same bug again with a
 * bigger number.
 */
const MAX_AUTO_PAGES = 10

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

  // Pulled out as primitives (plus react-query's stable `fetchNextPage`) so the
  // effect below depends on values that actually change, not on the query
  // object, which is a new reference every render and would re-run the effect
  // on every single one.
  const { fetchNextPage, isFetchingNextPage } = infiniteQuery
  const pageCount = infiniteQuery.data?.pages.length ?? 0
  const hasNextPage = infiniteQuery.hasNextPage ?? false
  const hitPageCeiling = hasNextPage && pageCount >= MAX_AUTO_PAGES

  // Keep pulling pages until the catalogue is complete.
  //
  // The list panel still paginates visually — this only changes WHEN the data
  // arrives, not how it renders. Without it the map is capped at whatever the
  // reader happened to scroll past, which is not a decision anyone made.
  //
  // Guarded three ways so this cannot become a request loop: only while a next
  // page exists, never while one is already in flight, and never past
  // MAX_AUTO_PAGES.
  useEffect(() => {
    if (!hasNextPage) return
    if (isFetchingNextPage) return
    if (pageCount >= MAX_AUTO_PAGES) return
    fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, pageCount, fetchNextPage])

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
    hasNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    /**
     * True when there are still more listings than this hook will auto-load.
     * The map is then genuinely incomplete and the UI must say so rather than
     * present a partial catalogue as the whole one.
     */
    hitPageCeiling,
  }
}
