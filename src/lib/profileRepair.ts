import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * Creates the minimal profile for an email/password account that has none —
 * the account was created but saving its profile failed (offline at that
 * moment). Signing in repairs it, the way Google and Apple sign-in already
 * do, and the setup steps continue (hostile review 2026-11-02, item 1b;
 * ADR-035's open follow-up). Same shape as a fresh email sign-up, without a
 * sign-up attribution: this is not a new sign-up. The rules refuse it for a
 * deleted account (deletedAccounts), which stays deleted.
 */
export async function repairMissingProfile(firebaseUser: { uid: string; email: string | null }): Promise<void> {
  const now = new Date()
  await setDoc(doc(db, 'users', firebaseUser.uid), {
    email: firebaseUser.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isActive: true,
    isPhoneVerified: false,
    isIdentityVerified: false,
    isVerifiedRealtor: false,
    claimsThisMonth: 0,
    claimMonth: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    authProvider: 'password',
  })
}
