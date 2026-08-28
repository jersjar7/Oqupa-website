// The order of the sign-up pipeline, as a pure function — approved in
// docs/new-user-navigation-path.md (step 6): phone before email; the email
// link LAST, and only for accounts whose provider did not already verify it.
import { describe, it, expect } from 'vitest'
import { pipelineStepsFor, emailEntryOutcome } from '../pipelineOrder'

describe('pipelineStepsFor', () => {
  it('email/password account, nothing done yet: name → phone → code → email last', () => {
    expect(pipelineStepsFor({ emailVerified: false, hasName: false, phoneVerified: false }))
      .toEqual(['name', 'phone', 'verify-code', 'verify-email'])
  })

  it('Google account (email already verified, name known): phone → code, nothing else', () => {
    expect(pipelineStepsFor({ emailVerified: true, hasName: true, phoneVerified: false }))
      .toEqual(['phone', 'verify-code'])
  })

  it('phone done, email link still unclicked: only the email step remains', () => {
    expect(pipelineStepsFor({ emailVerified: false, hasName: true, phoneVerified: true }))
      .toEqual(['verify-email'])
  })

  it('everything done: no steps', () => {
    expect(pipelineStepsFor({ emailVerified: true, hasName: true, phoneVerified: true })).toEqual([])
  })

  it('the email step is never before the phone step', () => {
    const steps = pipelineStepsFor({ emailVerified: false, hasName: true, phoneVerified: false })
    expect(steps.indexOf('verify-email')).toBeGreaterThan(steps.indexOf('verify-code'))
  })
})

describe('emailEntryOutcome', () => {
  // Production hides whether an email has an account (enumeration protection,
  // measured 2026-08-26), so a failed sign-in is the moment to offer both
  // "crea tu cuenta" and "olvidaste tu contraseña" — never to guess.
  it('a credential mismatch offers to create or recover', () => {
    for (const code of ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials']) {
      expect(emailEntryOutcome(code)).toBe('offer-create-or-recover')
    }
  })
  it('too many attempts is its own message', () => {
    expect(emailEntryOutcome('auth/too-many-requests')).toBe('too-many')
  })
  it('anything else is a plain error', () => {
    expect(emailEntryOutcome('auth/network-request-failed')).toBe('error')
    expect(emailEntryOutcome(undefined)).toBe('error')
  })
})
