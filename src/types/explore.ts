import type { Listing } from './listing'
import type { Property } from './property'
import type { RentalDurationType } from './enums'

export interface ListingWithProperty {
  listing: Listing
  property: Property
}

export interface MapFilters {
  operationType: 'venta' | 'alquiler' | null // null = all
  rentalDurationType: RentalDurationType | null // null = all
  propertyTypes: string[] // empty = all
  priceMin: number | null
  priceMax: number | null
}
