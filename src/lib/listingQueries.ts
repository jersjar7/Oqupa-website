import type { QueryClient } from '@tanstack/react-query'
import type { OperationType } from '@/types/enums'

/**
 * The query keys of every screen that shows listings. The hooks build their
 * keys from here, so the refresh below can never miss one.
 */
export const listingQueryKeys = {
  /** The owner's cards (Mis propiedades, Mi panel). */
  ownerAll: ['listings', 'user'] as const,
  owner: (userId: string | undefined) => ['listings', 'user', userId, 'withProperties'] as const,
  /** The explore map and list, every tab (Venta, Alquiler, Todos). */
  exploreAll: ['listings', 'explore'] as const,
  explore: (operationType: OperationType | undefined) => ['listings', 'explore', operationType] as const,
  /** The listing page. */
  detailAll: ['listings', 'detail'] as const,
  detail: (listingId: string | undefined) => ['listings', 'detail', listingId] as const,
}

/**
 * The ONE refresh after anything changes a listing: publish, edit, deactivate,
 * reactivate, Vendido / Alquilado, delete, agent help, a confirmed boost, a
 * refund. Refetches the owner's cards, the explore map and list on every tab,
 * and the listing page, from the server — screens never patch themselves.
 *
 * Screens open now refetch at once; the others are marked stale and refetch
 * when they open. `listingId` narrows only the listing-page refresh.
 */
export function invalidateListingQueries(queryClient: QueryClient, listingId?: string): Promise<void> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: listingQueryKeys.ownerAll }),
    queryClient.invalidateQueries({ queryKey: listingQueryKeys.exploreAll }),
    queryClient.invalidateQueries({
      queryKey: listingId ? listingQueryKeys.detail(listingId) : listingQueryKeys.detailAll,
    }),
  ]).then(() => undefined)
}
