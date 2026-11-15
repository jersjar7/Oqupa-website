// @vitest-environment jsdom
// ADR-060 (Jerson, 2026-11-13: "Fix names"): the website saves a person's
// name capitalized — the sign-up name step and Mi perfil (updateUserName),
// and the profile Google, Apple and an old magic link create — and the
// Firebase sign-in profile's copy follows.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const m = vi.hoisted(() => ({
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDoc: vi.fn(),
  signInWithPopup: vi.fn(),
  signInWithEmailLink: vi.fn(),
  updateProfile: vi.fn(),
  currentUser: null as null | { uid: string; displayName: string | null },
}))

vi.mock('firebase/auth', () => ({
  OAuthProvider: class { addScope = vi.fn() },
  GoogleAuthProvider: class { setCustomParameters = vi.fn() },
  signInWithPopup: (...a: unknown[]) => m.signInWithPopup(...a),
  signInWithEmailLink: (...a: unknown[]) => m.signInWithEmailLink(...a),
  browserPopupRedirectResolver: {},
  getAdditionalUserInfo: () => ({ isNewUser: true }),
  updateProfile: (...a: unknown[]) => m.updateProfile(...a),
  RecaptchaVerifier: class { clear = vi.fn() },
  PhoneAuthProvider: class { verifyPhoneNumber = vi.fn() },
  EmailAuthProvider: { credential: vi.fn() },
}))
vi.mock('firebase/firestore', () => ({
  doc: (..._a: unknown[]) => ({ path: 'users/x' }),
  setDoc: (...a: unknown[]) => m.setDoc(...a),
  updateDoc: (...a: unknown[]) => m.updateDoc(...a),
  getDoc: (...a: unknown[]) => m.getDoc(...a),
  serverTimestamp: () => ({ _ts: true }),
}))
vi.mock('firebase/functions', () => ({ getFunctions: vi.fn(() => ({})), httpsCallable: vi.fn(() => vi.fn()) }))
vi.mock('@/lib/profileRepair', () => ({ createProfileIfAbsent: vi.fn() }))
vi.mock('@/lib/firebase', () => ({
  get auth() { return { get currentUser() { return m.currentUser } } },
  db: {},
}))
vi.mock('@/lib/analytics', () => ({
  AnalyticsLogger: { registrationCompleted: vi.fn(), loginCompleted: vi.fn() },
}))

const { authService } = await import('../authService')

const newUser = (displayName: string | null) => ({
  uid: 'u1', email: 'u1@test.com', displayName,
  reload: vi.fn(), getIdToken: vi.fn(), providerData: [],
})

beforeEach(() => {
  m.setDoc.mockReset().mockResolvedValue(undefined)
  m.updateDoc.mockReset().mockResolvedValue(undefined)
  m.getDoc.mockReset().mockResolvedValue({ exists: () => false, data: () => ({}) })
  m.signInWithPopup.mockReset()
  m.signInWithEmailLink.mockReset()
  m.updateProfile.mockReset().mockResolvedValue(undefined)
  m.currentUser = null
})

describe('updateUserName (sign-up name step, Mi perfil)', () => {
  it('saves the name capitalized', async () => {
    await authService.updateUserName('u1', 'pedro jose guerrero vinces')
    expect(m.updateDoc.mock.calls[0]![1].name).toBe('Pedro Jose Guerrero Vinces')
  })

  it('returns the name as saved, so the page can show it', async () => {
    expect(await authService.updateUserName('u1', 'MARÍA DE LOS ÁNGELES')).toBe('María de los Ángeles')
  })

  it('the signed-in person\'s sign-in name follows', async () => {
    m.currentUser = { uid: 'u1', displayName: 'juan pérez' }
    await authService.updateUserName('u1', 'juan pérez')
    expect(m.updateProfile).toHaveBeenCalledWith(m.currentUser, { displayName: 'Juan Pérez' })
  })

  it('a sign-in name already right is not rewritten', async () => {
    m.currentUser = { uid: 'u1', displayName: 'Juan Pérez' }
    await authService.updateUserName('u1', 'juan pérez')
    expect(m.updateProfile).not.toHaveBeenCalled()
  })

  it('a failure to update the sign-in name never fails the save', async () => {
    m.currentUser = { uid: 'u1', displayName: 'x' }
    m.updateProfile.mockRejectedValue(new Error('offline'))
    await expect(authService.updateUserName('u1', 'ana torres')).resolves.toBe('Ana Torres')
  })
})

describe('first sign-in creates the profile with the name capitalized', () => {
  it('Google', async () => {
    const user = newUser('pedro jose guerrero vinces')
    m.signInWithPopup.mockResolvedValue({ user })
    await authService.signInWithGoogle()
    expect(m.setDoc.mock.calls[0]![1].name).toBe('Pedro Jose Guerrero Vinces')
    expect(m.updateProfile).toHaveBeenCalledWith(user, { displayName: 'Pedro Jose Guerrero Vinces' })
  })

  it('Apple', async () => {
    m.signInWithPopup.mockResolvedValue({ user: newUser('JOSÉ PÉREZ') })
    await authService.signInWithApple()
    expect(m.setDoc.mock.calls[0]![1].name).toBe('José Pérez')
  })

  it('an old magic link', async () => {
    m.signInWithEmailLink.mockResolvedValue({ user: newUser("ana-lucía o'neil") })
    await authService.completeMagicLinkSignIn('u1@test.com', 'https://x')
    expect(m.setDoc.mock.calls[0]![1].name).toBe("Ana-Lucía O'Neil")
  })

  it('a provider with no name still writes no name', async () => {
    m.signInWithPopup.mockResolvedValue({ user: newUser('   ') })
    await authService.signInWithGoogle()
    expect('name' in m.setDoc.mock.calls[0]![1]).toBe(false)
    expect(m.updateProfile).not.toHaveBeenCalled()
  })
})
