import { describe, it, expect } from 'vitest'
import { getRegisterAuthError, getForgotPasswordAuthError } from '../authErrors'

describe('getRegisterAuthError', () => {
  it('maps email-already-in-use to a sign-in nudge', () => {
    const info = getRegisterAuthError({ code: 'auth/email-already-in-use' })
    expect(info.message).toMatch(/ya existe una cuenta/i)
    expect(info.isRetryable).toBe(false)
  })

  it('maps weak-password to a min-length hint', () => {
    const info = getRegisterAuthError({ code: 'auth/weak-password' })
    expect(info.message).toMatch(/al menos 6 caracteres/i)
    expect(info.isRetryable).toBe(true)
  })

  it('maps invalid-email to a generic invalid-email message', () => {
    const info = getRegisterAuthError({ code: 'auth/invalid-email' })
    expect(info.message).toMatch(/correo válido/i)
    expect(info.isRetryable).toBe(true)
  })

  it('maps too-many-requests to a non-retryable cooldown message', () => {
    const info = getRegisterAuthError({ code: 'auth/too-many-requests' })
    expect(info.message).toMatch(/demasiados intentos/i)
    expect(info.isRetryable).toBe(false)
  })

  it('maps operation-not-allowed to a contact-support message', () => {
    const info = getRegisterAuthError({ code: 'auth/operation-not-allowed' })
    expect(info.message).toMatch(/contacta a soporte/i)
    expect(info.isRetryable).toBe(false)
  })

  it('maps network-request-failed to a connectivity message', () => {
    const info = getRegisterAuthError({ code: 'auth/network-request-failed' })
    expect(info.message).toMatch(/conexión a internet/i)
    expect(info.isRetryable).toBe(true)
  })

  it('falls back to a generic retryable message for unknown codes', () => {
    const info = getRegisterAuthError({ code: 'auth/something-else' })
    expect(info.message).toMatch(/no pudimos crear/i)
    expect(info.isRetryable).toBe(true)
  })

  it('extracts auth/* codes from plain Error.message strings', () => {
    const info = getRegisterAuthError(
      new Error('Firebase: Error (auth/email-already-in-use).')
    )
    expect(info.message).toMatch(/ya existe una cuenta/i)
  })
})

describe('getForgotPasswordAuthError', () => {
  it('maps auth/user-not-found to a no-account message', () => {
    const info = getForgotPasswordAuthError({ code: 'auth/user-not-found' })
    expect(info.message).toMatch(/no existe una cuenta/i)
  })

  // The checkAccountExists Cloud Function call (via the Functions SDK) can
  // fail independently of requestPasswordReset (the Auth SDK call) — this
  // handler now has to interpret errors from BOTH. Before these cases
  // existed, any checkAccountExists failure fell through to the default
  // "verify your email address" message, which is wrong for an
  // infrastructure problem rather than a bad address.
  it('maps functions/resource-exhausted to a rate-limit message, not a generic one', () => {
    const info = getForgotPasswordAuthError({ code: 'functions/resource-exhausted' })
    expect(info.message).toMatch(/demasiados intentos/i)
    expect(info.isRetryable).toBe(false)
  })

  it.each(['functions/unavailable', 'functions/deadline-exceeded', 'functions/internal'])(
    'maps %s to a server-connection message rather than "verify your email"',
    (code) => {
      const info = getForgotPasswordAuthError({ code })
      expect(info.message).toMatch(/conexión con el servidor/i)
      expect(info.message).not.toMatch(/verifica tu dirección/i)
      expect(info.isRetryable).toBe(true)
    }
  )

  it('still falls back to the address-check message for unrecognized auth/* codes', () => {
    const info = getForgotPasswordAuthError({ code: 'auth/something-else' })
    expect(info.message).toMatch(/verifica tu dirección/i)
  })
})
