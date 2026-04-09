import type { Timestamp } from 'firebase/firestore'

export interface WaitlistEntry {
  name: string
  phone: string
  email: string
  city: string
  budget: string
  contactConsent: boolean
  createdAt: Timestamp
}
