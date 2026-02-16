import type { Timestamp } from 'firebase/firestore'

export interface WaitlistEntry {
  name: string
  email: string
  intent: 'buscar' | 'publicar' | 'ambos'
  privacyConsent: boolean
  createdAt: Timestamp
}
