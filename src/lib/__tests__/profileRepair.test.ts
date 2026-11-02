// The repair of an email account with no profile, and the sign-up's retry:
// CREATE-ONLY (second review 2026-11-02, items 1, 3, 4). A transaction reads
// the profile and writes only if there is none — never over a real one.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const tx = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }))
const runTransactionMock = vi.hoisted(() => vi.fn())
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, c: string, id: string) => ({ path: `${c}/${id}` })),
  runTransaction: runTransactionMock,
  serverTimestamp: vi.fn(() => 'ts'),
}))
vi.mock('@/lib/firebase', () => ({ db: {} }))
const sendEmailVerificationMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))
vi.mock('firebase/auth', () => ({ sendEmailVerification: sendEmailVerificationMock }))
const attributionMock = vi.hoisted(() => vi.fn(() => ({ platform: 'web', door: 'email' }) as Record<string, string>))
vi.mock('@/lib/attribution', () => ({ signupAttribution: attributionMock }))

import { createProfileIfAbsent, repairMissingProfile } from '../profileRepair'

beforeEach(() => {
  vi.clearAllMocks()
  runTransactionMock.mockImplementation(async (_db: unknown, fn: (t: typeof tx) => unknown) => fn(tx))
  attributionMock.mockReturnValue({ platform: 'web', door: 'email' })
})

describe('createProfileIfAbsent', () => {
  it('writes when there is no profile', async () => {
    tx.get.mockResolvedValue({ exists: () => false })
    expect(await createProfileIfAbsent('u1', { email: 'a@b.co' })).toBe('created')
    expect(tx.set).toHaveBeenCalledWith({ path: 'users/u1' }, { email: 'a@b.co' })
  })

  it('never writes over a profile that exists', async () => {
    tx.get.mockResolvedValue({ exists: () => true })
    expect(await createProfileIfAbsent('u1', { email: 'a@b.co' })).toBe('existed')
    expect(tx.set).not.toHaveBeenCalled()
  })

  it('a refused attribution is dropped and the create retried', async () => {
    tx.get.mockResolvedValue({ exists: () => false })
    runTransactionMock
      .mockRejectedValueOnce({ code: 'permission-denied' })
      .mockImplementation(async (_db: unknown, fn: (t: typeof tx) => unknown) => fn(tx))
    await createProfileIfAbsent('u1', { email: 'a@b.co' }, { lastCampaign: 'x' })
    expect(tx.set).toHaveBeenLastCalledWith({ path: 'users/u1' }, { email: 'a@b.co' })
  })
})

describe('repairMissingProfile', () => {
  const user = { uid: 'u1', email: 'a@b.co', emailVerified: false }

  it('creates the minimal email profile, without a made-up attribution', async () => {
    tx.get.mockResolvedValue({ exists: () => false })
    await repairMissingProfile(user)
    const data = tx.set.mock.calls[0]![1] as Record<string, unknown>
    expect(data).toMatchObject({
      email: 'a@b.co', isActive: true, isPhoneVerified: false, isIdentityVerified: false,
      isVerifiedRealtor: false, claimsThisMonth: 0, authProvider: 'password',
    })
    expect(data).not.toHaveProperty('signupAttribution')
  })

  it('keeps a real sign-up attribution when the browser has one', async () => {
    tx.get.mockResolvedValue({ exists: () => false })
    attributionMock.mockReturnValue({ lastCampaign: 'piura-oct', platform: 'web', door: 'email' })
    await repairMissingProfile(user)
    expect((tx.set.mock.calls[0]![1] as Record<string, unknown>).signupAttribution)
      .toEqual({ lastCampaign: 'piura-oct', platform: 'web', door: 'email' })
  })

  it('sends the confirmation email after creating it, when not yet confirmed', async () => {
    tx.get.mockResolvedValue({ exists: () => false })
    await repairMissingProfile(user)
    expect(sendEmailVerificationMock).toHaveBeenCalledWith(user)
  })

  it('sends nothing when the profile was there after all, or already confirmed', async () => {
    tx.get.mockResolvedValue({ exists: () => true })
    await repairMissingProfile(user)
    tx.get.mockResolvedValue({ exists: () => false })
    await repairMissingProfile({ ...user, emailVerified: true })
    expect(sendEmailVerificationMock).not.toHaveBeenCalled()
  })
})
