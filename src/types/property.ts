export interface Listing {
  id: string
  propertyId: string
  description?: string
  price?: {
    amount: number
    currency?: string
  }
  contactInfo?: {
    whatsappPhoneNumber?: {
      phoneNumberWithCountryCode: string
    }
  }
  status: 'active' | 'inactive' | 'deleted'
}

export interface PropertySpecs {
  bedroomCount?: number
  bathroomCount?: number
  totalAreaInSquareMeters?: number
}

export interface Property {
  id: string
  propertyType: string
  location?: {
    distrito?: string
    ciudad?: string
  }
  specs?: PropertySpecs
  media?: {
    propertyPhotoUrls?: string[]
  }
}
