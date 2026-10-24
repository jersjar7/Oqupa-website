import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithEmailLink,
  isSignInWithEmailLink,
  fetchSignInMethodsForEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
  checkActionCode,
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithCredential,
  linkWithCredential,
  updatePassword,
  OAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  browserPopupRedirectResolver,
  updatePhoneNumber,
  getAdditionalUserInfo,
  verifyBeforeUpdateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type UserCredential,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { auth, db } from '@/lib/firebase'
import { AnalyticsLogger } from '@/lib/analytics'
import { signupAttribution, type SignupDoor } from '@/lib/attribution'
import { releaseCollidedPhone } from '@/lib/phoneRelease'

/**
 * Creates a new account's user document. If the security rules refuse it, the
 * one part a visitor can influence — the signupAttribution block, built from
 * URL campaign labels — is dropped and the write tried once more: a crafted
 * link must never cost someone their account (A12b hostile review). Any other
 * failure propagates unchanged.
 */
async function createUserDocument(uid: string, data: Record<string, unknown>) {
  try {
    await setDoc(doc(db, 'users', uid), data)
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code
    if (code !== 'permission-denied' || !('signupAttribution' in data)) throw error
    const { signupAttribution: _dropped, ...rest } = data
    await setDoc(doc(db, 'users', uid), rest)
  }
}

/**
 * The attribution block, only for a sign-in Firebase reports as brand new. A
 * missing profile on an older account (an app user's first web sign-in) is
 * not a sign-up and must not be counted as one (A12b review round 2).
 */
function newAccountAttribution(credential: UserCredential, door: SignupDoor) {
  return getAdditionalUserInfo(credential)?.isNewUser
    ? { signupAttribution: signupAttribution(door) }
    : {}
}

// Store for phone verification flow
let recaptchaVerifier: RecaptchaVerifier | null = null

export const authService = {
  async registerWithEmailAndPassword(email: string, password: string) {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    )
    const user = credential.user

    // Create Firestore user document
    const now = new Date()
    const claimMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const attribution = signupAttribution('email')
    await createUserDocument(user.uid, {
      email: user.email,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true,
      isPhoneVerified: false,
      isIdentityVerified: false,
      isVerifiedRealtor: false,
      claimsThisMonth: 0,
      claimMonth,
      authProvider: 'password',
      // Where this account came from — write-once in the rules (A12b).
      signupAttribution: attribution,
    })

    AnalyticsLogger.registrationCompleted({
      campaign: attribution.lastCampaign ?? attribution.firstCampaign ?? null,
      refListingId: attribution.refListingId ?? null,
    })
    return user
  },

  async loginWithEmailAndPassword(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    AnalyticsLogger.loginCompleted('email')
    return credential.user
  },

  async logout() {
    await signOut(auth)
  },

  // Sends Firebase's verifyEmail action link to the currently signed-in user.
  // The action handler lives at /app/auth/set-password (mode=verifyEmail);
  // SetPasswordPage applies the code and shows the success screen.
  async sendEmailVerificationToCurrentUser() {
    const user = auth.currentUser
    if (!user) throw new Error('No authenticated user')
    // DEV is always true in vitest; production URL branch is unreachable in tests
    /* v8 ignore start */
    const url = import.meta.env.DEV
      ? 'http://localhost:5173/app/verify'
      : 'https://oqupa.com/app/verify'
    /* v8 ignore stop */
    await sendEmailVerification(user, { url, handleCodeInApp: false })
  },

  // After the email link is clicked the browser keeps its previous ID token —
  // with email_verified:false — for up to an hour, and the security rules
  // read that claim. Forcing a refresh makes the new state effective at once.
  async refreshSession() {
    const user = auth.currentUser
    if (!user) return
    await user.getIdToken(true)
  },

  // Re-fetches the auth user from the server so a freshly verified email
  // (verified in another tab/device) flips emailVerified locally without
  // requiring a sign-out/sign-in.
  async reloadCurrentFirebaseUser() {
    const user = auth.currentUser
    if (!user) return null
    await user.reload()
    return auth.currentUser
  },

  // "¿No es tu correo? Cámbialo" (email sign-up fix, step 2). The link goes to
  // the NEW address; opening it switches and confirms the email and signs this
  // session out (measured on staging 2026-10-24). Firebase may want a recent
  // sign-in first — then the caller asks for the password and passes it here.
  async requestEmailChange(newEmail: string, password?: string) {
    const user = auth.currentUser
    if (!user) throw new Error('No authenticated user')
    if (password) {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email ?? '', password))
    }
    /* v8 ignore start */
    const url = import.meta.env.DEV
      ? 'http://localhost:5173/app/login?correo=1'
      : `${window.location.origin}/app/login?correo=1`
    /* v8 ignore stop */
    await verifyBeforeUpdateEmail(user, newEmail.trim(), { url, handleCodeInApp: false })
  },

  // The link page's half. An account still signed in on this browser under the
  // old address has just been revoked by the change; signing it out here keeps
  // this tab from acting on a dead session.
  async applyEmailChangeCode(oobCode: string): Promise<{ newEmail: string; previousEmail: string }> {
    const info = await checkActionCode(auth, oobCode)
    const newEmail = info.data.email ?? ''
    const previousEmail = info.data.previousEmail ?? ''
    await applyActionCode(auth, oobCode)
    const current = auth.currentUser?.email?.toLowerCase()
    if (current && (current === previousEmail.toLowerCase() || current === newEmail.toLowerCase())) {
      try {
        await signOut(auth)
      } catch {
        // The session is already dead; nothing more to do.
      }
    }
    return { newEmail, previousEmail }
  },

  // The undo link Firebase sends to the OLD address after a change.
  async applyRecoverEmailCode(oobCode: string): Promise<{ restoredEmail: string }> {
    const info = await checkActionCode(auth, oobCode)
    await applyActionCode(auth, oobCode)
    return { restoredEmail: info.data.email ?? '' }
  },

  async requestPasswordReset(email: string) {
    await sendPasswordResetEmail(auth, email)
  },

  // Auth migration helpers (magic-link → password). See AUTH-MIGRATION-PLAN.md.

  async getSignInMethods(email: string): Promise<string[]> {
    return fetchSignInMethodsForEmail(auth, email)
  },

  async sendPasswordSetupEmail(email: string) {
    // DEV is always true in vitest; production URL branch is unreachable in tests
    /* v8 ignore start */
    const url = import.meta.env.DEV
      ? 'http://localhost:5173/app/auth/set-password'
      : 'https://oqupa.com/app/auth/set-password'
    /* v8 ignore stop */
    await sendPasswordResetEmail(auth, email, {
      url,
      handleCodeInApp: true,
    })
  },

  async verifySetPasswordCode(oobCode: string): Promise<string> {
    return verifyPasswordResetCode(auth, oobCode)
  },

  // Email verification — invoked when the action link arrives with
  // mode=verifyEmail (sent by Firebase Auth's sendEmailVerification()).
  // checkActionCode resolves the email and confirms the code is for the
  // verifyEmail operation; applyActionCode actually flips the
  // emailVerified flag on the Firebase Auth user.
  async checkEmailVerificationCode(oobCode: string): Promise<string> {
    const info = await checkActionCode(auth, oobCode)
    return info.data.email ?? ''
  },

  async applyEmailVerificationCode(oobCode: string): Promise<void> {
    await applyActionCode(auth, oobCode)
  },

  async confirmSetPassword(oobCode: string, newPassword: string, email: string) {
    await confirmPasswordReset(auth, oobCode, newPassword)
    const credential = await signInWithEmailAndPassword(auth, email, newPassword)
    const user = credential.user
    // Use dot-path to stamp only passwordSetAt without clobbering server-side
    // stamps (announcedAt, reminderSentAt, finalNoticeSentAt).
    await updateDoc(doc(db, 'users', user.uid), {
      authProvider: 'password',
      'migrationState.passwordSetAt': serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    AnalyticsLogger.loginCompleted('passwordMigration')
    return user
  },

  async updateUserName(uid: string, name: string) {
    await updateDoc(doc(db, 'users', uid), {
      name,
      updatedAt: serverTimestamp(),
    })
  },

  async updateUserContactInfo(
    uid: string,
    contactInfo: {
      whatsappPhoneNumber: string
      countryCode: string
      preferredContactTimeSlot: string
      additionalContactNotes?: string
    }
  ) {
    await updateDoc(doc(db, 'users', uid), {
      contactInfo,
      updatedAt: serverTimestamp(),
    })
  },

  async changePassword(newPassword: string) {
    const user = auth.currentUser
    if (!user) throw new Error('No authenticated user')
    await updatePassword(user, newPassword)
  },

  // Phone verification flow
  initializeRecaptcha(containerId: string) {
    if (recaptchaVerifier) {
      recaptchaVerifier.clear()
    }
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
    })
    return recaptchaVerifier
  },

  async sendPhoneVerificationCode(phoneNumber: string) {
    if (!recaptchaVerifier) {
      throw new Error('Recaptcha not initialized')
    }

    const provider = new PhoneAuthProvider(auth)
    const verificationId = await provider.verifyPhoneNumber(
      phoneNumber,
      recaptchaVerifier
    )
    return verificationId
  },

  async verifyPhoneCode(verificationId: string, code: string) {
    const credential = PhoneAuthProvider.credential(verificationId, code)
    const currentUser = auth.currentUser

    if (currentUser) {
      const hasPhone = currentUser.providerData.some(
        (p) => p.providerId === 'phone'
      )
      try {
        if (hasPhone) {
          // Phone already linked — update to new number (atomic, no unlink needed)
          await updatePhoneNumber(currentUser, credential)
        } else {
          // First time linking phone to this account
          await linkWithCredential(currentUser, credential)
        }
      } catch (err) {
        // The number sits on another account. If that account is an abandoned
        // email sign-up, the server moves it here; otherwise this throws the
        // usual "already in use". docs/email-signup-fix-plan.md, step 4.
        await releaseCollidedPhone(err, {
          callRelease: (proof) =>
            httpsCallable(getFunctions(undefined, 'southamerica-east1'), 'releasePhoneFromUnfinishedAccount')(proof),
          refreshSession: async () => {
            await currentUser.getIdToken(true)
            await currentUser.reload()
          },
        })
      }
    } else {
      // Sign in with phone (standalone)
      await signInWithCredential(auth, credential)
    }

    // Mint a token that carries the phone.
    //
    // Linking updates the ACCOUNT at once, but the browser keeps the token it
    // already holds — without the phone_number claim — for up to an hour, and
    // security rules can read only the claim, never the account. Without this
    // refresh, someone who verifies their number and immediately publishes is
    // refused by a rule that cannot yet see the phone they just linked. The
    // email step has done the same since 6a, for the same reason.
    //
    // Swallowed on failure: the phone IS linked, and throwing here would send
    // a verified person back to the SMS step. The claim catches up on its own.
    try {
      await auth.currentUser?.getIdToken(true)
    } catch {
      // Intentionally ignored — see above.
    }

    // Update Firestore
    if (auth.currentUser) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        isPhoneVerified: true,
        updatedAt: serverTimestamp(),
      })
    }
  },

  // Magic-link send was retired as part of the password-first migration.
  // `isSignInLink` + `completeMagicLinkSignIn` remain so inbox-aged magic
  // links can still complete until the cleanup PR at T+35.

  isSignInLink(url: string) {
    return isSignInWithEmailLink(auth, url)
  },

  async completeMagicLinkSignIn(email: string, url: string) {
    const credential = await signInWithEmailLink(auth, email, url)
    const user = credential.user

    // Check if Firestore doc exists; create if new user
    const existingDoc = await getDoc(doc(db, 'users', user.uid))
    if (!existingDoc.exists()) {
      const now = new Date()
      const claimMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      await createUserDocument(user.uid, {
        email: user.email,
        // The provider already knows the name — the pipeline then skips the
        // name step, as the approved path says (hostile review, 2026-08-26).
        ...(user.displayName?.trim() ? { name: user.displayName.trim() } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        isPhoneVerified: false,
        isIdentityVerified: false,
        isVerifiedRealtor: false,
        claimsThisMonth: 0,
        claimMonth,
        authProvider: 'emailLink',
        // Where this account came from — write-once in the rules (A12b).
        ...newAccountAttribution(credential, 'email'),
      })
    }

    localStorage.removeItem('oqupa_signInEmail')
    AnalyticsLogger.loginCompleted('emailLink')
    return user
  },

  async signInWithApple() {
    const provider = new OAuthProvider('apple.com')
    provider.addScope('email')
    provider.addScope('name')
    const credential = await signInWithPopup(auth, provider, browserPopupRedirectResolver)
    const user = credential.user

    // Create Firestore doc if first time on web (mobile user logging in)
    const existingDoc = await getDoc(doc(db, 'users', user.uid))
    if (!existingDoc.exists()) {
      const now = new Date()
      const claimMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      await createUserDocument(user.uid, {
        email: user.email,
        // The provider already knows the name — the pipeline then skips the
        // name step, as the approved path says (hostile review, 2026-08-26).
        ...(user.displayName?.trim() ? { name: user.displayName.trim() } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        isPhoneVerified: false,
        isIdentityVerified: false,
        isVerifiedRealtor: false,
        claimsThisMonth: 0,
        claimMonth,
        authProvider: 'apple.com',
        // Where this account came from — write-once in the rules (A12b).
        ...newAccountAttribution(credential, 'apple'),
      })
    }
    AnalyticsLogger.loginCompleted('apple')
    return user
  },

  async signInWithGoogle() {
    const provider = new GoogleAuthProvider()
    // Always let the person pick: signing out of Oqupa leaves the browser
    // signed in to Google, and without the chooser "Usar otra cuenta" would
    // return them to the account they were leaving (review 2026-10-24).
    provider.setCustomParameters({ prompt: 'select_account' })
    const credential = await signInWithPopup(auth, provider, browserPopupRedirectResolver)
    const user = credential.user

    const existingDoc = await getDoc(doc(db, 'users', user.uid))
    if (!existingDoc.exists()) {
      const now = new Date()
      const claimMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      await createUserDocument(user.uid, {
        email: user.email,
        // The provider already knows the name — the pipeline then skips the
        // name step, as the approved path says (hostile review, 2026-08-26).
        ...(user.displayName?.trim() ? { name: user.displayName.trim() } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
        isPhoneVerified: false,
        isIdentityVerified: false,
        isVerifiedRealtor: false,
        claimsThisMonth: 0,
        claimMonth,
        authProvider: 'google.com',
        // Where this account came from — write-once in the rules (A12b).
        ...newAccountAttribution(credential, 'google'),
      })
    }
    AnalyticsLogger.loginCompleted('google')
    return user
  },

  async deleteAccount() {
    const functions = getFunctions(undefined, 'southamerica-east1')
    const deleteUserAccount = httpsCallable(functions, 'deleteUserAccount')
    await deleteUserAccount({})
    await signOut(auth)
  },

  cleanupRecaptcha() {
    if (recaptchaVerifier) {
      recaptchaVerifier.clear()
      recaptchaVerifier = null
    }
  },
}
