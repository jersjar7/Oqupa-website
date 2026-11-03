import { useQuery } from '@tanstack/react-query'
import { listingQueryKeys } from '@/lib/listingQueries'
import { firestoreService } from '@/services/firestoreService'
import { listingPageView, type ListingPageView } from '@/app/features/listings/listingVisibility'

interface UsePropertyOptions {
  /** The signed-in user's id, so an owner can see their own unpublished listing. */
  viewerId?: string | null
  /** False while sign-in is still being restored. A non-public listing waits
   *  for it, so its owner is not shown "not found" for a moment first. */
  authReady?: boolean
}

export function useProperty(
  listingId: string | undefined,
  { viewerId, authReady = true }: UsePropertyOptions = {},
) {
  const { data, isLoading: queryLoading, error, refetch } = useQuery({
    queryKey: listingQueryKeys.detail(listingId),
    queryFn: () => firestoreService.getListingWithProperty(listingId!),
    enabled: !!listingId,
  })

  const listing = data?.listing ?? null
  const property = data?.property ?? null

  const isOwner = Boolean(viewerId && listing && viewerId === listing.ownerId)
  const view: ListingPageView | null = listing ? listingPageView(listing.status, isOwner) : null

  // Who is looking only matters for a listing strangers cannot see.
  const waitingForAuth = !authReady && view === 'hidden'
  const isLoading = queryLoading || waitingForAuth

  const notFound = !isLoading && (!data || view === 'hidden')

  // Which failure, so an offline visitor is not told the listing was deleted
  // (audit 2026-11-02).
  const failure: 'network' | 'not-found' | null = isLoading
    ? null
    : error
      ? 'network'
      : notFound || !listingId
        ? 'not-found'
        : null

  return {
    failure,
    refetch,
    listing: notFound ? null : listing,
    property: notFound ? null : property,
    view: isLoading ? null : view,
    isLoading,
    error: error
      ? 'Error al cargar la propiedad'
      : !listingId
        ? 'No se proporcionó ID de propiedad'
        : notFound
          ? 'Propiedad no encontrada'
          : null,
  }
}
