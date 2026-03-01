import type { Currency, OperationType, PropertyType } from './enums'

export interface PropertySpecs {
  totalAreaInSquareMeters: number
  bedroomCount?: number // null for commercial/land
  bathroomCount?: number // null for land
  availableParkingSpaces: number
  propertyAmenities: string[]
}

export interface PropertyLocation {
  latitude: number
  longitude: number
  calle: string
  distrito: string
  provincia: string
  departamento: string
  countryIsoCode: string // 'PE'
}

export interface PropertyMedia {
  propertyPhotoUrls: string[]
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
  specs: {
    totalAreaInSquareMeters: number
    bedroomCount?: number
    bathroomCount?: number
    availableParkingSpaces: number
    propertyAmenities: string[]
  }
  location: {
    latitude: number
    longitude: number
    calle: string
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
  }
  updatedAt: unknown // Firestore Timestamp
  isAvailable: boolean
}
