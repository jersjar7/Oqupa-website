import { useMemo } from 'react'
import type { ListingWithProperty, MapFilters } from '@/types/explore'

export function useMapFilters(items: ListingWithProperty[], filters: MapFilters) {
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

  return { filtered, total: items.length }
}
