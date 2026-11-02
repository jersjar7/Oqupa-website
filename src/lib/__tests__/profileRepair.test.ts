// Hostile review 2026-11-02, item 1b: the repaired profile has the shape of
// a fresh email sign-up — never a sign-up attribution (it is not a new sign-up
// now), never anything verified.
import { describe, it, expect, vi } from 'vitest'

const setDocMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, c: string, id: string) => ({ path: `${c}/${id}` })),
  setDoc: setDocMock,
  serverTimestamp: vi.fn(() => 'ts'),
}))
vi.mock('@/lib/firebase', () => ({ db: {} }))

import { repairMissingProfile } from '../profileRepair'

describe('repairMissingProfile', () => {
  it('writes the minimal email profile for that account', async () => {
    await repairMissingProfile({ uid: 'u1', email: 'a@b.co' })
    const [ref, data] = setDocMock.mock.calls[0]! as unknown as [{ path: string }, Record<string, unknown>]
    expect(ref.path).toBe('users/u1')
    expect(data).toMatchObject({
      email: 'a@b.co',
      isActive: true,
      isPhoneVerified: false,
      isIdentityVerified: false,
      isVerifiedRealtor: false,
      claimsThisMonth: 0,
      authProvider: 'password',
    })
    expect(data).not.toHaveProperty('signupAttribution')
    expect(data).not.toHaveProperty('name')
  })
})
