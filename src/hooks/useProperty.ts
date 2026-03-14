import { useQuery } from '@tanstack/react-query'
import { firestoreService } from '@/services/firestoreService'

export function useProperty(listingId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['listings', 'detail', listingId],
    queryFn: () => firestoreService.getListingWithProperty(listingId!),
    enabled: !!listingId,
  })

  const listing = data?.listing ?? null
  const property = data?.property ?? null

  // Treat deactivated listings as not found
  const notFound =
    !isLoading && (!data || listing?.status === 'deactivated')

  return {
    listing,
    property,
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
