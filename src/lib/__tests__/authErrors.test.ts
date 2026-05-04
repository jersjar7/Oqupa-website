import { describe, it, expect } from 'vitest'
import { getRegisterAuthError } from '../authErrors'

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
