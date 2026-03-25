import type { Currency, OperationType, PropertyType, RentalDurationType } from './enums'

export interface PropertySpecs {
  totalAreaInSquareMeters: number
  bedroomCount?: number // null for commercial/land/habitacion
  bathroomCount?: number // null for land/habitacion
  availableParkingSpaces: number
  propertyAmenities: string[]
  hasPrivateBathroom?: boolean // only for habitacion type
}

export interface PropertyLocation {
  latitude: number
  longitude: number
  calle: string
  urbanizacion: string
  distrito: string
  provincia: string
  departamento: string
  countryIsoCode: string // 'PE'
}

export interface PropertyMedia {
  propertyPhotoUrls: string[]
  thumbnailPhotoUrls?: string[]
  photoBlurHashes?: string[]
}

export interface PropertyPrice {
  amount: number
  currency: Currency
}

// Matches Firestore `properties/{id}` document schema
export interface Property {
  id: string
  listedByUserId: string
  propertyType: PropertyType
  operationType: OperationType
  rentalDurationType?: RentalDurationType // null for venta, defaults to longTerm for alquiler
  specs: PropertySpecs
  location: PropertyLocation
  currentPrice: PropertyPrice
  normalizedAddress: string
  media: PropertyMedia
  updatedAt: Date
  isAvailable: boolean
}

// Firestore document shape
export interface PropertyFirestoreDoc {
  listedByUserId: string
  propertyType: string
  operationType: string
  rentalDurationType?: string // 'longTerm' | 'shortTerm'
  specs: {
    totalAreaInSquareMeters: number
    bedroomCount?: number
    bathroomCount?: number
    availableParkingSpaces: number
    propertyAmenities: string[]
    hasPrivateBathroom?: boolean
  }
  location: {
    latitude: number
    longitude: number
    calle: string
    urbanizacion: string
    distrito: string
    provincia: string
    departamento: string
    countryIsoCode: string
  }
  currentPrice: {
    amount: number
    currency: string
  }
  normalizedAddress: string
  media: {
    propertyPhotoUrls: string[]
    thumbnailPhotoUrls?: string[]
    photoBlurHashes?: string[]
  }
  updatedAt: unknown // Firestore Timestamp
  isAvailable: boolean
}
