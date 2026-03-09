import { useState, useMemo } from 'react'
import type { ListingWithProperty, MapFilters } from '@/types/explore'

const initialFilters: MapFilters = {
  operationType: null,
  propertyTypes: [],
  priceMin: null,
  priceMax: null,
}

export function useMapFilters(items: ListingWithProperty[]) {
  const [filters, setFilters] = useState<MapFilters>(initialFilters)

  const filtered = useMemo(() => {
    return items.filter(({ listing, property }) => {
      if (filters.operationType && property.operationType !== filters.operationType) {
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

  return { filters, setFilters, filtered, total: items.length }
}
