import type { Listing } from './listing'
import type { Property } from './property'

export interface ListingWithProperty {
  listing: Listing
  property: Property
}

export interface MapFilters {
  operationType: 'venta' | 'alquiler' | null // null = all
  propertyTypes: string[] // empty = all
  priceMin: number | null
  priceMax: number | null
}
