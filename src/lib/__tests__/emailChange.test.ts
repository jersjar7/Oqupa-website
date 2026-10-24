import { describe, it, expect, beforeEach } from 'vitest'
import {
  EMAIL_CHANGE_COPY,
  validateNewEmail,
  rememberPendingEmailChange,
  pendingEmailChange,
  clearPendingEmailChange,
  loginUrlAfterEmailChange,
  readEmailChangeArrival,
  profileEmailToSync,
} from '../emailChange'
import { getEmailChangeError, getEmailChangeLinkError } from '../authErrors'

// "¿No es tu correo? Cámbialo" — the email sign-up fix, step 2
// (docs/email-signup-fix-plan.md; wording approved by Jerson 2026-10-21).
// Measured on staging 2026-10-24: the request succeeds for ANY address (even
// one that already has an account — enumeration protection); opening the link
// switches the account's email and confirms it, and signs the old session out;
// the new email with the same password then signs in.

function memoryStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  }
}

describe('validateNewEmail', () => {
  it('accepts a different, well-formed address', () => {
    expect(validateNewEmail('old@x.com', 'new@x.com')).toBeNull()
  })
  it('refuses the address the account already has, however it is typed', () => {
    expect(validateNewEmail('Old@X.com', '  old@x.COM ')).toBe(EMAIL_CHANGE_COPY.sameEmail)
  })
  it('refuses something that is not an email', () => {
    expect(validateNewEmail('old@x.com', 'nope')).toBe(EMAIL_CHANGE_COPY.invalidEmail)
    expect(validateNewEmail('old@x.com', '')).toBe(EMAIL_CHANGE_COPY.invalidEmail)
    expect(validateNewEmail('old@x.com', 'a@b')).toBe(EMAIL_CHANGE_COPY.invalidEmail)
  })
})

describe('the pending change', () => {
  let storage: ReturnType<typeof memoryStorage>
  beforeEach(() => { storage = memoryStorage() })

  it('is remembered, trimmed and lower-cased, so the sign-in screen can offer it', () => {
    rememberPendingEmailChange(' New@X.com ', 1000, storage)
    expect(pendingEmailChange(1000, storage)).toBe('new@x.com')
  })
  it('is forgotten after a day', () => {
    rememberPendingEmailChange('new@x.com', 0, storage)
    expect(pendingEmailChange(24 * 60 * 60 * 1000 + 1, storage)).toBeNull()
  })
  it('can be cleared', () => {
    rememberPendingEmailChange('new@x.com', 0, storage)
    clearPendingEmailChange(storage)
    expect(pendingEmailChange(0, storage)).toBeNull()
  })
  it('survives a broken or blocked storage without throwing', () => {
    storage.setItem('oqupa_email_change_v1', '{not json')
    expect(pendingEmailChange(0, storage)).toBeNull()
    const throwing = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } }
    expect(() => rememberPendingEmailChange('a@b.co', 0, throwing)).not.toThrow()
    expect(pendingEmailChange(0, throwing)).toBeNull()
    expect(() => clearPendingEmailChange(throwing)).not.toThrow()
  })
})

describe('arriving at sign-in after the change', () => {
  it('the address opens the email form with the new email filled in', () => {
    const url = loginUrlAfterEmailChange('new+tag@x.com')
    expect(url.startsWith('/app/login?')).toBe(true)
    const q = new URLSearchParams(url.split('?')[1])
    expect(q.get('correo')).toBe('1')
    expect(q.get('email')).toBe('new+tag@x.com')
    expect(readEmailChangeArrival(q.toString())).toEqual({ email: 'new+tag@x.com', changed: true })
  })
  it('an ordinary sign-in address is not a change', () => {
    expect(readEmailChangeArrival('')).toEqual({ email: '', changed: false })
    expect(readEmailChangeArrival('email=a@b.co')).toEqual({ email: 'a@b.co', changed: false })
  })
})

describe('profileEmailToSync', () => {
  it('is the confirmed sign-in email when the profile still has the old one', () => {
    expect(profileEmailToSync({ authEmail: 'new@x.com', emailVerified: true, profileEmail: 'old@x.com' })).toBe('new@x.com')
  })
  it('is null when they already match (any case), or the sign-in email is unconfirmed or missing', () => {
    expect(profileEmailToSync({ authEmail: 'New@x.com', emailVerified: true, profileEmail: 'new@X.com' })).toBeNull()
    expect(profileEmailToSync({ authEmail: 'new@x.com', emailVerified: false, profileEmail: 'old@x.com' })).toBeNull()
    expect(profileEmailToSync({ authEmail: null, emailVerified: true, profileEmail: 'old@x.com' })).toBeNull()
  })
  it('fills a profile that has no email at all', () => {
    expect(profileEmailToSync({ authEmail: 'a@x.com', emailVerified: true, profileEmail: undefined })).toBe('a@x.com')
  })
})

describe('getEmailChangeError', () => {
  it('asks for the password when Firebase wants a recent sign-in', () => {
    expect(getEmailChangeError({ code: 'auth/requires-recent-login' })).toMatchObject({
      message: EMAIL_CHANGE_COPY.needsPassword, needsPassword: true,
    })
  })
  it('a wrong password says so', () => {
    for (const code of ['auth/wrong-password', 'auth/invalid-credential', 'auth/invalid-login-credentials']) {
      expect(getEmailChangeError({ code }).message).toBe(EMAIL_CHANGE_COPY.wrongPassword)
    }
  })
  it('a malformed address, and the rest, have their own sentences', () => {
    expect(getEmailChangeError({ code: 'auth/invalid-new-email' }).message).toBe(EMAIL_CHANGE_COPY.invalidEmail)
    expect(getEmailChangeError({ code: 'auth/invalid-email' }).message).toBe(EMAIL_CHANGE_COPY.invalidEmail)
    expect(getEmailChangeError({ code: 'auth/email-already-in-use' }).message).toBe(EMAIL_CHANGE_COPY.taken)
    expect(getEmailChangeError({ code: 'auth/too-many-requests' }).message).toMatch(/Demasiados intentos/)
    expect(getEmailChangeError({ code: 'auth/network-request-failed' }).message).toMatch(/conexión/)
  })
  it('anything unknown shows its code', () => {
    expect(getEmailChangeError({ code: 'auth/odd-thing' }).message).toBe('No pudimos cambiar tu correo. Intenta de nuevo. (auth/odd-thing)')
  })
})

describe('getEmailChangeLinkError — the confirmation link', () => {
  it('an address that already has an account is explained, not hidden', () => {
    expect(getEmailChangeLinkError({ code: 'auth/email-already-in-use' })).toBe(EMAIL_CHANGE_COPY.taken)
  })
  it('a used or expired link asks for a new one', () => {
    expect(getEmailChangeLinkError({ code: 'auth/invalid-action-code' })).toBe(EMAIL_CHANGE_COPY.linkExpired)
    expect(getEmailChangeLinkError({ code: 'auth/expired-action-code' })).toBe(EMAIL_CHANGE_COPY.linkExpired)
  })
  it('anything unknown shows its code', () => {
    expect(getEmailChangeLinkError({ code: 'auth/odd' })).toBe(`${EMAIL_CHANGE_COPY.linkFailed} (auth/odd)`)
  })
})
