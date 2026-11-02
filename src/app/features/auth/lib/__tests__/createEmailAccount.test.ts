// @vitest-environment jsdom
// Hostile review 2026-11-02, item 1a. Reproduces the orphan account: the
// account is created, then saving its profile fails (offline at that
// moment). The person must stay on the page, see why, and be able to retry;
// the confirmation email goes out only after the profile is saved.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuthService = vi.hoisted(() => ({
  registerWithEmailAndPassword: vi.fn(),
  saveNewEmailProfile: vi.fn(),
  sendEmailVerificationToCurrentUser: vi.fn(),
}))
vi.mock('@/services/authService', () => ({ authService: mockAuthService }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
const mockRefreshUser = vi.hoisted(() => vi.fn())
vi.mock('@/stores/authStore', () => ({ useAuthStore: { getState: () => ({ refreshUser: mockRefreshUser }) } }))
vi.mock('@/app/features/listings/contactFunnel', () => ({
  CONTACT_GATE_STEPS: { signedIn: 'signed_in' },
  pendingContactErrand: vi.fn(),
  logContactMilestone: vi.fn(),
}))

import { createEmailAccount, retryNewProfile, isProfileSaveFailure } from '../createEmailAccount'
import { accountCreation } from '@/lib/accountCreation'

const offline = Object.assign(new Error('offline'), { code: 'unavailable', profileSaveFailed: true })

describe('createEmailAccount — the profile save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accountCreation.end()
    mockAuthService.sendEmailVerificationToCurrentUser.mockResolvedValue(undefined)
    mockRefreshUser.mockResolvedValue(undefined)
  })

  it('holds the page while it works, and lets go when done', async () => {
    let during = false
    mockAuthService.registerWithEmailAndPassword.mockImplementation(async () => {
      during = accountCreation.isInFlight()
      return { uid: 'u' }
    })
    await createEmailAccount('a@b.co', 'Abcdefg1!')
    expect(during).toBe(true)
    expect(accountCreation.isInFlight()).toBe(false)
  })

  it('offline at creation: says so, keeps the page, sends no email yet', async () => {
    mockAuthService.registerWithEmailAndPassword.mockRejectedValue(offline)
    const err = await createEmailAccount('a@b.co', 'Abcdefg1!').catch((e) => e)
    expect(isProfileSaveFailure(err)).toBe(true)
    expect(accountCreation.isInFlight()).toBe(true)
    expect(mockAuthService.sendEmailVerificationToCurrentUser).not.toHaveBeenCalled()
  })

  it('a retry saves the profile, then sends the email and lets the page go', async () => {
    mockAuthService.registerWithEmailAndPassword.mockRejectedValue(offline)
    await createEmailAccount('a@b.co', 'Abcdefg1!').catch(() => {})
    mockAuthService.saveNewEmailProfile.mockResolvedValue(undefined)
    await retryNewProfile()
    expect(mockAuthService.saveNewEmailProfile).toHaveBeenCalled()
    expect(mockAuthService.sendEmailVerificationToCurrentUser).toHaveBeenCalled()
    expect(mockAuthService.saveNewEmailProfile.mock.invocationCallOrder[0]!)
      .toBeLessThan(mockAuthService.sendEmailVerificationToCurrentUser.mock.invocationCallOrder[0]!)
    expect(accountCreation.isInFlight()).toBe(false)
  })

  it('a failed retry keeps the page held', async () => {
    mockAuthService.registerWithEmailAndPassword.mockRejectedValue(offline)
    await createEmailAccount('a@b.co', 'Abcdefg1!').catch(() => {})
    mockAuthService.saveNewEmailProfile.mockRejectedValue(offline)
    await expect(retryNewProfile()).rejects.toBeDefined()
    expect(accountCreation.isInFlight()).toBe(true)
  })

  it('an account that was never created releases the page at once', async () => {
    mockAuthService.registerWithEmailAndPassword.mockRejectedValue({ code: 'auth/email-already-in-use' })
    await createEmailAccount('a@b.co', 'Abcdefg1!').catch(() => {})
    expect(accountCreation.isInFlight()).toBe(false)
  })
})
