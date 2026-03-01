import type {
  ContactTimeSlot,
  SupportedCountryCode,
  RealtorApplicationStatus,
} from './enums'

// Shared value object used by both User and Listing
export interface ContactInfo {
  whatsappPhoneNumber: string // International format (e.g. "+51912345678")
  countryCode: SupportedCountryCode
  preferredContactTimeSlot: ContactTimeSlot
  additionalContactNotes?: string
}

// Matches Firestore `users/{uid}` document schema
export interface User {
  id: string // Firebase Auth UID (document ID)
  email: string
  name?: string
  contactInfo?: ContactInfo
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  isPhoneVerified: boolean
  isIdentityVerified: boolean
  identityVerifiedAt?: Date
  photoUrl?: string
  authProvider?: string // 'password' | 'google.com' | 'apple.com'

  // Realtor fields
  isVerifiedRealtor: boolean
  realtorApplicationStatus?: RealtorApplicationStatus
  realtorApplicationDate?: Date
  realtorBusinessName?: string
  realtorYearsExperience?: number
  realtorServiceZones?: string[]
  claimsThisMonth: number
  claimMonth: string // YYYY-MM format
}

// Firestore document shape (what's actually stored)
// Timestamps are Firestore Timestamps, not JS Dates
export interface UserFirestoreDoc {
  email: string
  name?: string
  contactInfo?: {
    whatsappPhoneNumber: string
    countryCode: string
    preferredContactTimeSlot: string
    additionalContactNotes?: string
  }
  createdAt: unknown // Firestore Timestamp
  updatedAt: unknown // Firestore Timestamp
  isActive: boolean
  isPhoneVerified: boolean
  isIdentityVerified: boolean
  identityVerifiedAt?: unknown // Firestore Timestamp
  photoUrl?: string
  authProvider?: string
  isVerifiedRealtor: boolean
  realtorApplicationStatus?: string
  realtorApplicationDate?: unknown // Firestore Timestamp
  realtorBusinessName?: string
  realtorYearsExperience?: number
  realtorServiceZones?: string[]
  claimsThisMonth: number
  claimMonth: string
}
