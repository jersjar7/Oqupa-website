import { useMemo } from 'react'
import type { ListingWithProperty, MapFilters } from '@/types/explore'
import type { Bounds } from '@/lib/map/mapPoint'
import { DEFAULT_PEN_PER_USD } from '@/lib/map/exchangeRates'

/** A typed amount, converted into the listing's own currency (the app's
 *  displayListings rule: the range is held in both currencies and each
 *  listing is compared in the one it is priced in). */
function inListingCurrency(
  amount: number,
  typedIn: 'USD' | 'PEN',
  listingCurrency: string,
  penPerUsd: number,
): number {
  if (listingCurrency === typedIn) return amount
  if (typedIn === 'USD' && listingCurrency === 'PEN') return amount * penPerUsd
  if (typedIn === 'PEN' && listingCurrency === 'USD') return amount / penPerUsd
  return amount
}

export function useMapFilters(
  items: ListingWithProperty[],
  filters: MapFilters,
  bounds?: Bounds | null,
  penPerUsd: number = DEFAULT_PEN_PER_USD,
) {
  const filtered = useMemo(() => {
    return items.filter(({ listing, property }) => {
      // operationType is filtered server-side via Firestore query
      if (filters.rentalDurationType && property.rentalDurationType !== filters.rentalDurationType) {
        return false
      }
      if (filters.propertyTypes.length > 0 && !filters.propertyTypes.includes(property.propertyType)) {
        return false
      }
      const { amount, currency } = listing.price
      const typedIn = filters.priceCurrency
      if (filters.priceMin != null && amount < inListingCurrency(filters.priceMin, typedIn, currency, penPerUsd)) {
        return false
      }
      if (filters.priceMax != null && amount > inListingCurrency(filters.priceMax, typedIn, currency, penPerUsd)) {
        return false
      }
      return true
    })
  }, [items, filters, penPerUsd])

  // Items visible in the current map viewport (used for cards panel)
  const visible = useMemo(() => {
    if (!bounds) return filtered
    return filtered.filter(({ listing, property }) => {
      const lat = listing.displayLatitude ?? property.location.latitude
      const lng = listing.displayLongitude ?? property.location.longitude
      return (
        lat >= bounds.south &&
        lat <= bounds.north &&
        lng >= bounds.west &&
        lng <= bounds.east
      )
    })
  }, [filtered, bounds])

  return { filtered, visible, total: items.length }
}
