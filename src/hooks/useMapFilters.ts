import { useMemo } from 'react'
import type { ListingWithProperty, MapFilters } from '@/types/explore'

export function useMapFilters(
  items: ListingWithProperty[],
  filters: MapFilters,
  bounds?: google.maps.LatLngBoundsLiteral | null,
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
      if (filters.priceMin != null && listing.price.amount < filters.priceMin) {
        return false
      }
      if (filters.priceMax != null && listing.price.amount > filters.priceMax) {
        return false
      }
      return true
    })
  }, [items, filters])

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
