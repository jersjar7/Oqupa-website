import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  isSignInWithEmailLink,
  RecaptchaVerifier,
  PhoneAuthProvider,
  signInWithCredential,
  linkWithCredential,
  updatePassword,
  OAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  browserPopupRedirectResolver,
  initializeRecaptchaConfig,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

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

    return user
  },

  async loginWithEmailAndPassword(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    return credential.user
  },

  async logout() {
    await signOut(auth)
  },

  async requestPasswordReset(email: string) {
    await sendPasswordResetEmail(auth, email)
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
  async initializeRecaptcha(containerId: string) {
    if (recaptchaVerifier) {
      recaptchaVerifier.clear()
    }
    await initializeRecaptchaConfig(auth)
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
      // Link phone credential to existing email/password account
      await linkWithCredential(currentUser, credential)
    } else {
      // Sign in with phone (standalone)
      await signInWithCredential(auth, credential)
    }

    // Update Firestore
    if (auth.currentUser) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        isPhoneVerified: true,
        updatedAt: serverTimestamp(),
      })
    }
  },

  async sendMagicLink(email: string) {
    const actionCodeSettings = {
      url: 'https://oqupa.com/app/auth/complete',
      handleCodeInApp: true,
      linkDomain: 'oqupa.com',
    }
    await sendSignInLinkToEmail(auth, email, actionCodeSettings)
    localStorage.setItem('oqupa_signInEmail', email)
  },

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
    return user
  },

  async getUserDoc(uid: string) {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null
    return snap.data()
  },

  cleanupRecaptcha() {
    if (recaptchaVerifier) {
      recaptchaVerifier.clear()
      recaptchaVerifier = null
    }
  },
}
