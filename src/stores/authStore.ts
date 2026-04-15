import { create } from 'zustand'
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc, type Timestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { User } from '@/types/user'
import type { ContactTimeSlot, SupportedCountryCode } from '@/types/enums'

interface AuthState {
  firebaseUser: FirebaseUser | null
  user: User | null
  isLoading: boolean
  isInitialized: boolean
  _unsubscribe: (() => void) | null
  initialize: () => void
  refreshUser: () => Promise<void>
  setUser: (user: User | null) => void
  reset: () => void
}

function parseTimestamp(value: unknown): Date {
  if (!value) return new Date()
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as Timestamp).toDate()
  }
  if (typeof value === 'string') return new Date(value)
  return new Date()
}

function firestoreDocToUser(
  uid: string,
  data: Record<string, unknown>
): User {
  const contactData = data['contactInfo'] as
    | Record<string, unknown>
    | undefined

  return {
    id: uid,
    email: (data['email'] as string) ?? '',
    name: data['name'] as string | undefined,
    contactInfo: contactData
      ? {
          whatsappPhoneNumber: contactData['whatsappPhoneNumber'] as string,
          countryCode:
            (contactData['countryCode'] as SupportedCountryCode) ?? 'peru',
          preferredContactTimeSlot:
            (contactData['preferredContactTimeSlot'] as ContactTimeSlot) ??
            'anytime',
          additionalContactNotes: contactData[
            'additionalContactNotes'
          ] as string | undefined,
        }
      : undefined,
    createdAt: parseTimestamp(data['createdAt']),
    updatedAt: parseTimestamp(data['updatedAt']),
    isActive: (data['isActive'] as boolean) ?? true,
    isPhoneVerified: (data['isPhoneVerified'] as boolean) ?? false,
    isIdentityVerified: (data['isIdentityVerified'] as boolean) ?? false,
    identityVerifiedAt: data['identityVerifiedAt']
      ? parseTimestamp(data['identityVerifiedAt'])
      : undefined,
    photoUrl: data['photoUrl'] as string | undefined,
    authProvider: data['authProvider'] as string | undefined,
    isVerifiedRealtor: (data['isVerifiedRealtor'] as boolean) ?? false,
    realtorApplicationStatus: data['realtorApplicationStatus'] as
      | User['realtorApplicationStatus']
      | undefined,
    realtorApplicationDate: data['realtorApplicationDate']
      ? parseTimestamp(data['realtorApplicationDate'])
      : undefined,
    realtorBusinessName: data['realtorBusinessName'] as string | undefined,
    realtorYearsExperience: data['realtorYearsExperience'] as
      | number
      | undefined,
    realtorServiceZones: data['realtorServiceZones']
      ? (data['realtorServiceZones'] as string[])
      : undefined,
    claimsThisMonth: (data['claimsThisMonth'] as number) ?? 0,
    claimMonth:
      (data['claimMonth'] as string) ??
      `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
  }
}

const authChannel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('oqupa-auth')
  : null

export const useAuthStore = create<AuthState>((set, get) => ({
  firebaseUser: null,
  user: null,
  isLoading: true,
  isInitialized: false,
  _unsubscribe: null,

  initialize: () => {
    // Prevent double-initialization
    if (get()._unsubscribe) return

    // Wait for Firebase to resolve persisted session from IndexedDB
    // before listening. This prevents a premature null callback.
    auth.authStateReady().then(() => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          set({ firebaseUser, isLoading: true })
          try {
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
            if (userDoc.exists()) {
              const user = firestoreDocToUser(
                firebaseUser.uid,
                userDoc.data() as Record<string, unknown>
              )
              set({ user, isLoading: false, isInitialized: true })
            } else {
              // Firebase Auth user exists but no Firestore doc yet
              // (mid-registration - doc will be created by authService)
              set({
                user: null,
                isLoading: false,
                isInitialized: true,
              })
            }
          } catch {
            set({ user: null, isLoading: false, isInitialized: true })
          }
        } else {
          set({
            firebaseUser: null,
            user: null,
            isLoading: false,
            isInitialized: true,
          })
          authChannel?.postMessage({ type: 'logout' })
        }
      })

      authChannel?.addEventListener('message', (event) => {
        if (event.data?.type === 'logout') {
          auth.authStateReady().then(() => {
            if (!auth.currentUser) {
              set({
                firebaseUser: null,
                user: null,
                isLoading: false,
                isInitialized: true,
              })
            }
          })
        }
      })

      set({ _unsubscribe: unsubscribe })
    })
  },

  refreshUser: async () => {
    const { firebaseUser } = get()
    if (!firebaseUser) return

    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
    if (userDoc.exists()) {
      const user = firestoreDocToUser(
        firebaseUser.uid,
        userDoc.data() as Record<string, unknown>
      )
      set({ user })
    }
  },

  setUser: (user) => set({ user }),

  reset: () => {
    const { _unsubscribe } = get()
    _unsubscribe?.()
    set({
      firebaseUser: null,
      user: null,
      isLoading: false,
      isInitialized: false,
      _unsubscribe: null,
    })
  },
}))
