import type { Timestamp } from 'firebase/firestore'

// Despite the legacy "Waitlist" naming (kept to avoid renaming the Firestore
// collection + Trigger Email rules), the entries are now expansion-city
// interest signups: a user in another Peru departamento asking us to bring
// Oqupa to their region.
export interface WaitlistEntry {
  name: string
  phone: string
  email: string
  departamento: string
  contactConsent: boolean
  createdAt: Timestamp
}
