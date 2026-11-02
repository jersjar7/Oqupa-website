import { doc, runTransaction, serverTimestamp } from 'firebase/firestore'
import { sendEmailVerification } from 'firebase/auth'
import { db } from '@/lib/firebase'
import { signupAttribution } from '@/lib/attribution'

/**
 * Creates users/{uid} ONLY if it does not exist: a transaction reads it (from
 * the server) and writes only when there is none — never over a real profile
 * (second review 2026-11-02, items 1 and 4). A refused attribution block is
 * dropped and the create retried, as at sign-up. Offline, it throws and
 * nothing is written.
 */
export async function createProfileIfAbsent(
  uid: string,
  data: Record<string, unknown>,
  attribution?: Record<string, string>,
): Promise<'created' | 'existed'> {
  const ref = doc(db, 'users', uid)
  const attempt = (payload: Record<string, unknown>) =>
    runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (snap.exists()) return 'existed' as const
      tx.set(ref, payload)
      return 'created' as const
    })
  if (!attribution) return attempt(data)
  try {
    return await attempt({ ...data, signupAttribution: attribution })
  } catch (error) {
    if ((error as { code?: unknown } | null)?.code !== 'permission-denied') throw error
    return attempt(data)
  }
}

/** The sign-up attribution only if this browser really has one — never made up. */
function realAttribution(): Record<string, string> | undefined {
  const block = signupAttribution('email')
  return Object.keys(block).some((k) => k !== 'platform' && k !== 'door') ? block : undefined
}

/**
 * Creates the minimal profile for an email/password account that has none —
 * its sign-up could not save one (offline at that moment). Signing in
 * repairs it, the way Google and Apple sign-in already do, and the setup
 * steps continue (hostile review 2026-11-02, item 1b; ADR-035's open
 * follow-up). Same shape as a fresh website email sign-up (active, nothing
 * verified). The rules refuse it for a deleted account, which stays deleted.
 * After creating it, the confirmation email goes out as after a sign-up.
 */
export async function repairMissingProfile(firebaseUser: {
  uid: string
  email: string | null
  emailVerified?: boolean
}): Promise<void> {
  const now = new Date()
  const outcome = await createProfileIfAbsent(
    firebaseUser.uid,
    {
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
    },
    realAttribution(),
  )
  if (outcome === 'created' && !firebaseUser.emailVerified) {
    await sendEmailVerification(firebaseUser as Parameters<typeof sendEmailVerification>[0]).catch(() => {})
  }
}
