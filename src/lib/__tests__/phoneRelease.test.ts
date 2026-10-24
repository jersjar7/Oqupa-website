import { describe, it, expect, vi } from 'vitest'
import { phoneProofFromError, releaseCollidedPhone } from '../phoneRelease'

// The email sign-up fix, step 4 (docs/email-signup-fix-plan.md): a number held
// by an abandoned email sign-up moves to the person who just proved they own
// it, instead of the "Este número ya está asociado a otra cuenta" dead end.

const collision = (customData: Record<string, unknown> = { temporaryProof: 'tp-1', phoneNumber: '+16505552222' }) => ({
  code: 'auth/credential-already-in-use',
  customData,
})

function deps(overrides: Partial<Parameters<typeof releaseCollidedPhone>[1]> = {}) {
  return {
    callRelease: vi.fn().mockResolvedValue({ data: { success: true } }),
    refreshSession: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('phoneProofFromError', () => {
  it('reads the proof Firebase returns on a phone collision', () => {
    expect(phoneProofFromError(collision())).toEqual({ temporaryProof: 'tp-1', phoneNumber: '+16505552222' })
  })
  it('also for account-exists-with-different-credential', () => {
    expect(phoneProofFromError({ ...collision(), code: 'auth/account-exists-with-different-credential' })).not.toBeNull()
  })
  it('is null for any other error, or without a proof', () => {
    expect(phoneProofFromError({ code: 'auth/invalid-verification-code', customData: { temporaryProof: 'x', phoneNumber: '+1' } })).toBeNull()
    expect(phoneProofFromError(collision({ phoneNumber: '+16505552222' }))).toBeNull()
    expect(phoneProofFromError(collision({ temporaryProof: 'tp' }))).toBeNull()
    expect(phoneProofFromError(null)).toBeNull()
    expect(phoneProofFromError('boom')).toBeNull()
  })
})

describe('releaseCollidedPhone', () => {
  it('sends the proof to the server and refreshes the session so the phone counts at once', async () => {
    const d = deps()
    await releaseCollidedPhone(collision(), d)
    expect(d.callRelease).toHaveBeenCalledWith({ temporaryProof: 'tp-1', phoneNumber: '+16505552222' })
    expect(d.refreshSession).toHaveBeenCalledOnce()
  })

  it('rethrows the original error when there is no proof to send', async () => {
    const d = deps()
    const err = { code: 'auth/invalid-verification-code' }
    await expect(releaseCollidedPhone(err, d)).rejects.toBe(err)
    expect(d.callRelease).not.toHaveBeenCalled()
  })

  it('a number on a finished account stays a clear "already in use"', async () => {
    const d = deps({
      callRelease: vi.fn().mockRejectedValue({ code: 'functions/failed-precondition', details: { reason: 'held-by-active-account' } }),
    })
    await expect(releaseCollidedPhone(collision(), d)).rejects.toMatchObject({ code: 'auth/credential-already-in-use' })
    expect(d.refreshSession).not.toHaveBeenCalled()
  })

  it('an account that already has a number reads the same way', async () => {
    const d = deps({
      callRelease: vi.fn().mockRejectedValue({ code: 'functions/failed-precondition', details: { reason: 'caller-has-phone' } }),
    })
    await expect(releaseCollidedPhone(collision(), d)).rejects.toMatchObject({ code: 'auth/credential-already-in-use' })
  })

  it('a proof the server will not accept asks for a new code', async () => {
    const d = deps({ callRelease: vi.fn().mockRejectedValue({ code: 'functions/permission-denied' }) })
    await expect(releaseCollidedPhone(collision(), d)).rejects.toMatchObject({ code: 'auth/invalid-verification-id' })
  })

  it('anything else is passed on unchanged, so its code is shown', async () => {
    const err = { code: 'functions/internal' }
    const d = deps({ callRelease: vi.fn().mockRejectedValue(err) })
    await expect(releaseCollidedPhone(collision(), d)).rejects.toBe(err)
  })

  it('a failed session refresh does not undo a number that did move', async () => {
    const d = deps({ refreshSession: vi.fn().mockRejectedValue(new Error('offline')) })
    await expect(releaseCollidedPhone(collision(), d)).resolves.toBeUndefined()
  })
})
