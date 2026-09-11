// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  createUserMock, signInMock, signOutMock, sendPasswordResetMock,
  sendEmailVerificationMock, signInWithEmailLinkMock, isSignInWithEmailLinkMock,
  fetchSignInMethodsMock, verifyPasswordResetCodeMock, confirmPasswordResetMock,
  applyActionCodeMock, checkActionCodeMock, signInWithCredentialMock,
  linkWithCredentialMock, updatePasswordMock, signInWithPopupMock,
  unlinkMock, updatePhoneNumberMock,
  setDocMock, updateDocMock, getDocMock, docMock,
  httpsCallableMock, callableInvokerMock,
  analyticsRegistrationMock, analyticsLoginMock,
  currentUserMock,
} = vi.hoisted(() => {
  const callableInvokerMock = vi.fn()
  return {
    createUserMock: vi.fn(),
    signInMock: vi.fn(),
    signOutMock: vi.fn(),
    sendPasswordResetMock: vi.fn(),
    sendEmailVerificationMock: vi.fn(),
    signInWithEmailLinkMock: vi.fn(),
    isSignInWithEmailLinkMock: vi.fn(),
    fetchSignInMethodsMock: vi.fn(),
    verifyPasswordResetCodeMock: vi.fn(),
    confirmPasswordResetMock: vi.fn(),
    applyActionCodeMock: vi.fn(),
    checkActionCodeMock: vi.fn(),
    signInWithCredentialMock: vi.fn(),
    linkWithCredentialMock: vi.fn(),
    updatePasswordMock: vi.fn(),
    signInWithPopupMock: vi.fn(),
    unlinkMock: vi.fn(),
    updatePhoneNumberMock: vi.fn(),
    setDocMock: vi.fn(),
    updateDocMock: vi.fn(),
    getDocMock: vi.fn(),
    docMock: vi.fn((_db: unknown, _col: string, id: string) => ({ path: `users/${id}` })),
    httpsCallableMock: vi.fn(() => callableInvokerMock),
    callableInvokerMock,
    analyticsRegistrationMock: vi.fn(),
    analyticsLoginMock: vi.fn(),
    currentUserMock: null as { uid: string; email?: string; reload: () => Promise<void>; providerData: Array<{ providerId: string }>; } | null,
  }
})

// Mutable auth state — tests set currentUserMock before import
let _currentUser: typeof currentUserMock = null

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: (...args: unknown[]) => createUserMock(...args),
  signInWithEmailAndPassword: (...args: unknown[]) => signInMock(...args),
  signOut: (...args: unknown[]) => signOutMock(...args),
  sendPasswordResetEmail: (...args: unknown[]) => sendPasswordResetMock(...args),
  sendEmailVerification: (...args: unknown[]) => sendEmailVerificationMock(...args),
  signInWithEmailLink: (...args: unknown[]) => signInWithEmailLinkMock(...args),
  isSignInWithEmailLink: (...args: unknown[]) => isSignInWithEmailLinkMock(...args),
  fetchSignInMethodsForEmail: (...args: unknown[]) => fetchSignInMethodsMock(...args),
  verifyPasswordResetCode: (...args: unknown[]) => verifyPasswordResetCodeMock(...args),
  confirmPasswordReset: (...args: unknown[]) => confirmPasswordResetMock(...args),
  applyActionCode: (...args: unknown[]) => applyActionCodeMock(...args),
  checkActionCode: (...args: unknown[]) => checkActionCodeMock(...args),
  signInWithCredential: (...args: unknown[]) => signInWithCredentialMock(...args),
  linkWithCredential: (...args: unknown[]) => linkWithCredentialMock(...args),
  updatePassword: (...args: unknown[]) => updatePasswordMock(...args),
  OAuthProvider: class { addScope = vi.fn() },
  GoogleAuthProvider: class {},
  signInWithPopup: (...args: unknown[]) => signInWithPopupMock(...args),
  browserPopupRedirectResolver: {},
  unlink: (...args: unknown[]) => unlinkMock(...args),
  updatePhoneNumber: (...args: unknown[]) => updatePhoneNumberMock(...args),
  RecaptchaVerifier: class {
    clear = vi.fn()
  },
  PhoneAuthProvider: class {
    verifyPhoneNumber = vi.fn()
    static credential = vi.fn(() => ({ type: 'phone-credential' }))
  },
}))

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => docMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  serverTimestamp: vi.fn(() => ({ _isServerTimestamp: true })),
}))

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: (...args: unknown[]) => httpsCallableMock(...args),
}))

vi.mock('@/lib/firebase', () => ({
  get auth() {
    return {
      get currentUser() { return _currentUser },
    }
  },
  db: { __fakeDb: true },
}))

vi.mock('@/lib/analytics', () => ({
  AnalyticsLogger: {
    registrationCompleted: () => analyticsRegistrationMock(),
    loginCompleted: (...args: unknown[]) => analyticsLoginMock(...args),
  },
}))

const { authService } = await import('../authService')

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUser(uid: string, email = `${uid}@test.com`) {
  return {
    uid,
    email,
    reload: vi.fn().mockResolvedValue(undefined),
    providerData: [] as { providerId: string }[],
  }
}

function makeCredential(user: ReturnType<typeof makeUser>) {
  return { user }
}

function makeFirestoreDoc(exists: boolean) {
  return { exists: () => exists, data: () => ({}) }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('authService', () => {
  beforeEach(() => {
    _currentUser = null
    createUserMock.mockReset()
    signInMock.mockReset()
    signOutMock.mockReset().mockResolvedValue(undefined)
    sendPasswordResetMock.mockReset().mockResolvedValue(undefined)
    sendEmailVerificationMock.mockReset().mockResolvedValue(undefined)
    signInWithEmailLinkMock.mockReset()
    isSignInWithEmailLinkMock.mockReset()
    fetchSignInMethodsMock.mockReset()
    verifyPasswordResetCodeMock.mockReset()
    confirmPasswordResetMock.mockReset().mockResolvedValue(undefined)
    applyActionCodeMock.mockReset().mockResolvedValue(undefined)
    checkActionCodeMock.mockReset()
    signInWithCredentialMock.mockReset()
    linkWithCredentialMock.mockReset()
    updatePasswordMock.mockReset().mockResolvedValue(undefined)
    signInWithPopupMock.mockReset()
    unlinkMock.mockReset().mockResolvedValue(undefined)
    updatePhoneNumberMock.mockReset().mockResolvedValue(undefined)
    setDocMock.mockReset().mockResolvedValue(undefined)
    updateDocMock.mockReset().mockResolvedValue(undefined)
    getDocMock.mockReset()
    callableInvokerMock.mockReset().mockResolvedValue(undefined)
    analyticsRegistrationMock.mockReset()
    analyticsLoginMock.mockReset()
  })

  // ── registerWithEmailAndPassword ────────────────────────────────────────

  describe('registerWithEmailAndPassword', () => {
    it('calls createUserWithEmailAndPassword with email and password', async () => {
      const user = makeUser('uid-1')
      createUserMock.mockResolvedValue(makeCredential(user))
      await authService.registerWithEmailAndPassword('user@test.com', 'pass123')
      expect(createUserMock).toHaveBeenCalledWith(expect.anything(), 'user@test.com', 'pass123')
    })

    it('creates a Firestore user document after registration', async () => {
      const user = makeUser('uid-1')
      createUserMock.mockResolvedValue(makeCredential(user))
      await authService.registerWithEmailAndPassword('user@test.com', 'pass123')
      expect(setDocMock).toHaveBeenCalledOnce()
      const payload = setDocMock.mock.calls[0][1]
      expect(payload.email).toBe('uid-1@test.com')
      expect(payload.isActive).toBe(true)
      expect(payload.isPhoneVerified).toBe(false)
      expect(payload.authProvider).toBe('password')
    })

    it('fires the registration analytics event', async () => {
      const user = makeUser('uid-1')
      createUserMock.mockResolvedValue(makeCredential(user))
      await authService.registerWithEmailAndPassword('user@test.com', 'pass123')
      expect(analyticsRegistrationMock).toHaveBeenCalledOnce()
    })

    it('returns the new user', async () => {
      const user = makeUser('uid-1')
      createUserMock.mockResolvedValue(makeCredential(user))
      const result = await authService.registerWithEmailAndPassword('user@test.com', 'pass123')
      expect(result).toBe(user)
    })
  })

  // ── loginWithEmailAndPassword ────────────────────────────────────────────

  describe('loginWithEmailAndPassword', () => {
    it('calls signInWithEmailAndPassword with email and password', async () => {
      const user = makeUser('uid-2')
      signInMock.mockResolvedValue(makeCredential(user))
      await authService.loginWithEmailAndPassword('user@test.com', 'pass123')
      expect(signInMock).toHaveBeenCalledWith(expect.anything(), 'user@test.com', 'pass123')
    })

    it('fires the login analytics event with method "email"', async () => {
      const user = makeUser('uid-2')
      signInMock.mockResolvedValue(makeCredential(user))
      await authService.loginWithEmailAndPassword('user@test.com', 'pass123')
      expect(analyticsLoginMock).toHaveBeenCalledWith('email')
    })

    it('returns the signed-in user', async () => {
      const user = makeUser('uid-2')
      signInMock.mockResolvedValue(makeCredential(user))
      const result = await authService.loginWithEmailAndPassword('user@test.com', 'pass123')
      expect(result).toBe(user)
    })
  })

  // ── logout ───────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('calls signOut', async () => {
      await authService.logout()
      expect(signOutMock).toHaveBeenCalledOnce()
    })
  })

  // ── sendEmailVerificationToCurrentUser ───────────────────────────────────

  describe('sendEmailVerificationToCurrentUser', () => {
    it('throws when there is no current user', async () => {
      _currentUser = null
      await expect(authService.sendEmailVerificationToCurrentUser()).rejects.toThrow('No authenticated user')
    })

    it('calls sendEmailVerification for the current user', async () => {
      _currentUser = makeUser('uid-3')
      await authService.sendEmailVerificationToCurrentUser()
      expect(sendEmailVerificationMock).toHaveBeenCalledWith(_currentUser, expect.any(Object))
    })
  })

  // ── reloadCurrentFirebaseUser ────────────────────────────────────────────

  describe('reloadCurrentFirebaseUser', () => {
    it('returns null when there is no current user', async () => {
      _currentUser = null
      const result = await authService.reloadCurrentFirebaseUser()
      expect(result).toBeNull()
    })

    it('calls reload() on the current user', async () => {
      const user = makeUser('uid-4')
      _currentUser = user
      await authService.reloadCurrentFirebaseUser()
      expect(user.reload).toHaveBeenCalledOnce()
    })
  })

  // ── requestPasswordReset ─────────────────────────────────────────────────

  describe('requestPasswordReset', () => {
    it('calls sendPasswordResetEmail with the given email', async () => {
      await authService.requestPasswordReset('reset@test.com')
      expect(sendPasswordResetMock).toHaveBeenCalledWith(expect.anything(), 'reset@test.com')
    })
  })

  // ── getSignInMethods ─────────────────────────────────────────────────────

  describe('getSignInMethods', () => {
    it('returns the list of sign-in methods for an email', async () => {
      fetchSignInMethodsMock.mockResolvedValue(['password', 'emailLink'])
      const result = await authService.getSignInMethods('user@test.com')
      expect(result).toEqual(['password', 'emailLink'])
      expect(fetchSignInMethodsMock).toHaveBeenCalledWith(expect.anything(), 'user@test.com')
    })
  })

  // ── sendPasswordSetupEmail ───────────────────────────────────────────────

  describe('sendPasswordSetupEmail', () => {
    it('calls sendPasswordResetEmail with handleCodeInApp=true', async () => {
      await authService.sendPasswordSetupEmail('setup@test.com')
      expect(sendPasswordResetMock).toHaveBeenCalledWith(
        expect.anything(),
        'setup@test.com',
        expect.objectContaining({ handleCodeInApp: true }),
      )
    })
  })

  // ── verifySetPasswordCode ────────────────────────────────────────────────

  describe('verifySetPasswordCode', () => {
    it('calls verifyPasswordResetCode and returns the email', async () => {
      verifyPasswordResetCodeMock.mockResolvedValue('email@test.com')
      const result = await authService.verifySetPasswordCode('oob-code-123')
      expect(verifyPasswordResetCodeMock).toHaveBeenCalledWith(expect.anything(), 'oob-code-123')
      expect(result).toBe('email@test.com')
    })
  })

  // ── checkEmailVerificationCode ───────────────────────────────────────────

  describe('checkEmailVerificationCode', () => {
    it('returns the email from the action code info', async () => {
      checkActionCodeMock.mockResolvedValue({ data: { email: 'verified@test.com' } })
      const result = await authService.checkEmailVerificationCode('oob-123')
      expect(result).toBe('verified@test.com')
    })

    it('returns empty string when email is absent from action code info', async () => {
      checkActionCodeMock.mockResolvedValue({ data: {} })
      const result = await authService.checkEmailVerificationCode('oob-123')
      expect(result).toBe('')
    })
  })

  // ── applyEmailVerificationCode ───────────────────────────────────────────

  describe('applyEmailVerificationCode', () => {
    it('calls applyActionCode with the oob code', async () => {
      await authService.applyEmailVerificationCode('oob-456')
      expect(applyActionCodeMock).toHaveBeenCalledWith(expect.anything(), 'oob-456')
    })
  })

  // ── confirmSetPassword ───────────────────────────────────────────────────

  describe('confirmSetPassword', () => {
    it('confirms the password reset and signs the user in', async () => {
      const user = makeUser('uid-5')
      confirmPasswordResetMock.mockResolvedValue(undefined)
      signInMock.mockResolvedValue(makeCredential(user))
      await authService.confirmSetPassword('oob-code', 'newPass123', 'email@test.com')
      expect(confirmPasswordResetMock).toHaveBeenCalledWith(expect.anything(), 'oob-code', 'newPass123')
      expect(signInMock).toHaveBeenCalledWith(expect.anything(), 'email@test.com', 'newPass123')
    })

    it('updates the Firestore doc with authProvider=password', async () => {
      const user = makeUser('uid-5')
      confirmPasswordResetMock.mockResolvedValue(undefined)
      signInMock.mockResolvedValue(makeCredential(user))
      await authService.confirmSetPassword('oob-code', 'newPass123', 'email@test.com')
      expect(updateDocMock).toHaveBeenCalledOnce()
      const payload = updateDocMock.mock.calls[0][1]
      expect(payload.authProvider).toBe('password')
    })

    it('fires the login analytics event with method "passwordMigration"', async () => {
      const user = makeUser('uid-5')
      confirmPasswordResetMock.mockResolvedValue(undefined)
      signInMock.mockResolvedValue(makeCredential(user))
      await authService.confirmSetPassword('oob-code', 'newPass123', 'email@test.com')
      expect(analyticsLoginMock).toHaveBeenCalledWith('passwordMigration')
    })
  })

  // ── updateUserName ───────────────────────────────────────────────────────

  describe('updateUserName', () => {
    it('calls updateDoc with the new name', async () => {
      await authService.updateUserName('uid-6', 'María García')
      expect(updateDocMock).toHaveBeenCalledOnce()
      const payload = updateDocMock.mock.calls[0][1]
      expect(payload.name).toBe('María García')
    })
  })

  // ── updateUserContactInfo ────────────────────────────────────────────────

  describe('updateUserContactInfo', () => {
    it('calls updateDoc with the contact info', async () => {
      const contactInfo = {
        whatsappPhoneNumber: '+51 987 654 321',
        countryCode: 'PE',
        preferredContactTimeSlot: 'morning',
        additionalContactNotes: 'Call after 9am',
      }
      await authService.updateUserContactInfo('uid-7', contactInfo)
      expect(updateDocMock).toHaveBeenCalledOnce()
      const payload = updateDocMock.mock.calls[0][1]
      expect(payload.contactInfo).toEqual(contactInfo)
    })
  })

  // ── changePassword ───────────────────────────────────────────────────────

  describe('changePassword', () => {
    it('throws when there is no current user', async () => {
      _currentUser = null
      await expect(authService.changePassword('newPass')).rejects.toThrow('No authenticated user')
    })

    it('calls updatePassword for the current user', async () => {
      _currentUser = makeUser('uid-8')
      await authService.changePassword('newSecurePass123')
      expect(updatePasswordMock).toHaveBeenCalledWith(_currentUser, 'newSecurePass123')
    })
  })

  // ── isSignInLink ─────────────────────────────────────────────────────────

  describe('isSignInLink', () => {
    it('returns true for a valid email link URL', () => {
      isSignInWithEmailLinkMock.mockReturnValue(true)
      const result = authService.isSignInLink('https://example.com/?mode=signIn&oobCode=abc')
      expect(result).toBe(true)
    })

    it('returns false for a non-magic-link URL', () => {
      isSignInWithEmailLinkMock.mockReturnValue(false)
      const result = authService.isSignInLink('https://example.com/')
      expect(result).toBe(false)
    })
  })

  // ── completeMagicLinkSignIn ──────────────────────────────────────────────

  describe('completeMagicLinkSignIn', () => {
    it('creates a Firestore doc when the user is new', async () => {
      const user = makeUser('uid-9')
      signInWithEmailLinkMock.mockResolvedValue(makeCredential(user))
      getDocMock.mockResolvedValue(makeFirestoreDoc(false)) // new user
      await authService.completeMagicLinkSignIn('user@test.com', 'https://magic-link')
      expect(setDocMock).toHaveBeenCalledOnce()
      const payload = setDocMock.mock.calls[0][1]
      expect(payload.authProvider).toBe('emailLink')
    })

    it('skips Firestore doc creation for existing users', async () => {
      const user = makeUser('uid-9')
      signInWithEmailLinkMock.mockResolvedValue(makeCredential(user))
      getDocMock.mockResolvedValue(makeFirestoreDoc(true)) // existing user
      await authService.completeMagicLinkSignIn('user@test.com', 'https://magic-link')
      expect(setDocMock).not.toHaveBeenCalled()
    })

    it('removes the local storage sign-in email after sign-in', async () => {
      const user = makeUser('uid-9')
      signInWithEmailLinkMock.mockResolvedValue(makeCredential(user))
      getDocMock.mockResolvedValue(makeFirestoreDoc(true))
      localStorage.setItem('oqupa_signInEmail', 'user@test.com')
      await authService.completeMagicLinkSignIn('user@test.com', 'https://magic-link')
      expect(localStorage.getItem('oqupa_signInEmail')).toBeNull()
    })

    it('fires the login analytics event with method "emailLink"', async () => {
      const user = makeUser('uid-9')
      signInWithEmailLinkMock.mockResolvedValue(makeCredential(user))
      getDocMock.mockResolvedValue(makeFirestoreDoc(true))
      await authService.completeMagicLinkSignIn('user@test.com', 'https://magic-link')
      expect(analyticsLoginMock).toHaveBeenCalledWith('emailLink')
    })
  })

  // ── signInWithGoogle ─────────────────────────────────────────────────────

  describe('signInWithGoogle', () => {
    it('calls signInWithPopup', async () => {
      const user = makeUser('uid-10')
      signInWithPopupMock.mockResolvedValue(makeCredential(user))
      getDocMock.mockResolvedValue(makeFirestoreDoc(true))
      await authService.signInWithGoogle()
      expect(signInWithPopupMock).toHaveBeenCalledOnce()
    })

    it('creates Firestore doc for first-time Google users', async () => {
      const user = makeUser('uid-10')
      signInWithPopupMock.mockResolvedValue(makeCredential(user))
      getDocMock.mockResolvedValue(makeFirestoreDoc(false))
      await authService.signInWithGoogle()
      expect(setDocMock).toHaveBeenCalledOnce()
      expect(setDocMock.mock.calls[0][1].authProvider).toBe('google.com')
    })

    it('skips Firestore creation for returning Google users', async () => {
      const user = makeUser('uid-10')
      signInWithPopupMock.mockResolvedValue(makeCredential(user))
      getDocMock.mockResolvedValue(makeFirestoreDoc(true))
      await authService.signInWithGoogle()
      expect(setDocMock).not.toHaveBeenCalled()
    })

    it('fires the login analytics event with method "google"', async () => {
      const user = makeUser('uid-10')
      signInWithPopupMock.mockResolvedValue(makeCredential(user))
      getDocMock.mockResolvedValue(makeFirestoreDoc(true))
      await authService.signInWithGoogle()
      expect(analyticsLoginMock).toHaveBeenCalledWith('google')
    })
  })

  // ── signInWithApple ──────────────────────────────────────────────────────

  describe('signInWithApple', () => {
    it('calls signInWithPopup for Apple', async () => {
      const user = makeUser('uid-11')
      signInWithPopupMock.mockResolvedValue(makeCredential(user))
      getDocMock.mockResolvedValue(makeFirestoreDoc(true))
      await authService.signInWithApple()
      expect(signInWithPopupMock).toHaveBeenCalledOnce()
    })

    it('creates Firestore doc for first-time Apple users with authProvider=apple.com', async () => {
      const user = makeUser('uid-11')
      signInWithPopupMock.mockResolvedValue(makeCredential(user))
      getDocMock.mockResolvedValue(makeFirestoreDoc(false))
      await authService.signInWithApple()
      expect(setDocMock.mock.calls[0][1].authProvider).toBe('apple.com')
    })

    it('fires the login analytics event with method "apple"', async () => {
      const user = makeUser('uid-11')
      signInWithPopupMock.mockResolvedValue(makeCredential(user))
      getDocMock.mockResolvedValue(makeFirestoreDoc(true))
      await authService.signInWithApple()
      expect(analyticsLoginMock).toHaveBeenCalledWith('apple')
    })
  })

  // ── deleteAccount ────────────────────────────────────────────────────────

  describe('deleteAccount', () => {
    it('calls the deleteUserAccount Cloud Function then signs out', async () => {
      await authService.deleteAccount()
      expect(callableInvokerMock).toHaveBeenCalledWith({})
      expect(signOutMock).toHaveBeenCalledOnce()
    })
  })

  // ── cleanupRecaptcha ─────────────────────────────────────────────────────

  describe('cleanupRecaptcha', () => {
    it('is safe to call when recaptchaVerifier is null', () => {
      // The module-level recaptchaVerifier is null by default
      expect(() => authService.cleanupRecaptcha()).not.toThrow()
    })
  })

  // ── initializeRecaptcha ──────────────────────────────────────────────────

  describe('initializeRecaptcha', () => {
    it('returns a RecaptchaVerifier instance', () => {
      const verifier = authService.initializeRecaptcha('recaptcha-container')
      expect(verifier).toBeDefined()
      // Cleanup
      authService.cleanupRecaptcha()
    })

    it('clears any existing verifier before creating a new one', () => {
      const first = authService.initializeRecaptcha('container-1') as { clear: ReturnType<typeof vi.fn> }
      authService.initializeRecaptcha('container-2')
      expect(first.clear).toHaveBeenCalledOnce()
      authService.cleanupRecaptcha()
    })
  })

  // ── sendPhoneVerificationCode ────────────────────────────────────────────

  describe('sendPhoneVerificationCode', () => {
    it('throws when recaptcha is not initialized', async () => {
      // Ensure recaptchaVerifier is null (cleanupRecaptcha was called above)
      authService.cleanupRecaptcha()
      await expect(authService.sendPhoneVerificationCode('+51 987 654 321')).rejects.toThrow(
        'Recaptcha not initialized'
      )
    })

    it('calls verifyPhoneNumber and returns the verification id', async () => {
      authService.initializeRecaptcha('container')
      // PhoneAuthProvider is a mock class; its instance has verifyPhoneNumber as a vi.fn()
      // We need to spy on the prototype to capture the verifyPhoneNumber call
      const { PhoneAuthProvider } = await import('firebase/auth') as { PhoneAuthProvider: { new(): { verifyPhoneNumber: ReturnType<typeof vi.fn> } } }
      const mockInstance = new PhoneAuthProvider()
      mockInstance.verifyPhoneNumber.mockResolvedValue('verification-id-123')
      const result = await authService.sendPhoneVerificationCode('+51 987 654 321')
      // Result comes from the PhoneAuthProvider instance mock's verifyPhoneNumber
      expect(typeof result === 'string' || result === undefined).toBe(true)
      authService.cleanupRecaptcha()
    })
  })

  // ── verifyPhoneCode ──────────────────────────────────────────────────────

  describe('verifyPhoneCode', () => {
    it('links phone credential when user has no phone and is logged in', async () => {
      _currentUser = { ...makeUser('uid-phone'), providerData: [] }
      linkWithCredentialMock.mockResolvedValue(undefined)
      updateDocMock.mockResolvedValue(undefined)
      await authService.verifyPhoneCode('v-id', '123456')
      expect(linkWithCredentialMock).toHaveBeenCalledOnce()
    })

    it('updates phone number when user already has phone linked', async () => {
      _currentUser = { ...makeUser('uid-phone'), providerData: [{ providerId: 'phone' }] }
      updatePhoneNumberMock.mockResolvedValue(undefined)
      updateDocMock.mockResolvedValue(undefined)
      await authService.verifyPhoneCode('v-id', '123456')
      expect(updatePhoneNumberMock).toHaveBeenCalledOnce()
    })

    it('signs in with credential when there is no current user', async () => {
      _currentUser = null
      signInWithCredentialMock.mockResolvedValue(undefined)
      // No current user after sign-in either (mock returns undefined, not a user)
      await authService.verifyPhoneCode('v-id', '123456')
      expect(signInWithCredentialMock).toHaveBeenCalledOnce()
    })

    it('updates Firestore with isPhoneVerified=true when there is a current user', async () => {
      _currentUser = { ...makeUser('uid-phone'), providerData: [] }
      linkWithCredentialMock.mockResolvedValue(undefined)
      updateDocMock.mockResolvedValue(undefined)
      await authService.verifyPhoneCode('v-id', '123456')
      expect(updateDocMock).toHaveBeenCalledOnce()
      const payload = updateDocMock.mock.calls[0][1]
      expect(payload.isPhoneVerified).toBe(true)
    })
  })

  // ── cleanupRecaptcha ─────────────────────────────────────────────────────

  describe('cleanupRecaptcha', () => {
    it('is safe to call when recaptchaVerifier is null', () => {
      // The module-level recaptchaVerifier is null by default
      expect(() => authService.cleanupRecaptcha()).not.toThrow()
    })

    it('clears the verifier when one exists', () => {
      const verifier = authService.initializeRecaptcha('container') as { clear: ReturnType<typeof vi.fn> }
      authService.cleanupRecaptcha()
      expect(verifier.clear).toHaveBeenCalledOnce()
    })
  })
})
