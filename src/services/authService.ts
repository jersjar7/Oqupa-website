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

    await setDoc(doc(db, 'users', user.uid), {
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
    })

    AnalyticsLogger.registrationCompleted()
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
    const url = import.meta.env.DEV
      ? 'http://localhost:5173/app/verify'
      : 'https://oqupa.com/app/verify'
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

  async requestPasswordReset(email: string) {
    await sendPasswordResetEmail(auth, email)
  },

  // Auth migration helpers (magic-link → password). See AUTH-MIGRATION-PLAN.md.

  async getSignInMethods(email: string): Promise<string[]> {
    return fetchSignInMethodsForEmail(auth, email)
  },

  // Server-side "does this email have an account" check via the
  // `checkAccountExists` Cloud Function. Unlike getSignInMethods above,
  // this is reliable even with Email Enumeration Protection enabled on the
  // Auth project — that setting makes fetchSignInMethodsForEmail always
  // resolve to an empty array, client-side, regardless of whether the
  // account exists. Only the Admin SDK (server-side) can answer this.
  async checkAccountExists(email: string): Promise<boolean> {
    const functions = getFunctions(undefined, 'southamerica-east1')
    const checkAccountExists = httpsCallable<{ email: string }, { exists: boolean }>(
      functions,
      'checkAccountExists',
    )
    const result = await checkAccountExists({ email })
    return result.data.exists
  },

  async sendPasswordSetupEmail(email: string) {
    const url = import.meta.env.DEV
      ? 'http://localhost:5173/app/auth/set-password'
      : 'https://oqupa.com/app/auth/set-password'
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
      if (hasPhone) {
        // Phone already linked — update to new number (atomic, no unlink needed)
        await updatePhoneNumber(currentUser, credential)
      } else {
        // First time linking phone to this account
        await linkWithCredential(currentUser, credential)
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

      await setDoc(doc(db, 'users', user.uid), {
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

      await setDoc(doc(db, 'users', user.uid), {
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
      })
    }
    AnalyticsLogger.loginCompleted('apple')
    return user
  },

  async signInWithGoogle() {
    const provider = new GoogleAuthProvider()
    const credential = await signInWithPopup(auth, provider, browserPopupRedirectResolver)
    const user = credential.user

    const existingDoc = await getDoc(doc(db, 'users', user.uid))
    if (!existingDoc.exists()) {
      const now = new Date()
      const claimMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

      await setDoc(doc(db, 'users', user.uid), {
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
