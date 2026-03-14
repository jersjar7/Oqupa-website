import type { ContactInfo } from './user'
import type { Currency, ListingRole, ListingStatus, OperationType } from './enums'

export interface Price {
  amount: number
  currency: Currency
}

export interface Media {
  propertyPhotoUrls: string[]
}

// Matches Firestore `listings/{id}` document schema
export interface Listing {
  id: string
  role: ListingRole
  ownerId: string
  propertyId: string
  description: string
  operationType: OperationType
  price: Price
  contactInfo?: ContactInfo
  status: ListingStatus
  viewCount: number
  createdAt: Date
  publishedAt?: Date
  expiresAt?: Date
  updatedAt: Date
  media: Media

  // Realtor help fields
  wantsRealtorHelp: boolean
  maxRealtors: number // 1, 3, 5, 10, or 999
  currentClaimsCount: number

  // Assignment fields
  assignedRealtorId?: string
  assignedRealtorPhoneNumber?: string
}

// Firestore document shape
export interface ListingFirestoreDoc {
  role: string
  ownerId: string
  propertyId: string
  description: string
  price: {
    amount: number
    currency: string
  }
  contactInfo?: {
    whatsappPhoneNumber: string
    countryCode: string
    preferredContactTimeSlot: string
    additionalContactNotes?: string
  }
  status: string
  viewCount: number
  createdAt: unknown // Firestore Timestamp
  publishedAt?: unknown
  expiresAt?: unknown
  updatedAt: unknown
  media: {
    propertyPhotoUrls: string[]
  }
  wantsRealtorHelp: boolean
  maxRealtors: number
  currentClaimsCount: number
  assignedRealtorId?: string
  assignedRealtorPhoneNumber?: string
}
