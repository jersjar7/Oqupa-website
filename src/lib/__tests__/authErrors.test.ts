import { describe, it, expect } from 'vitest'
import {
  getRegisterAuthError,
  getLoginAuthError,
  getPhoneAuthError,
  getMagicLinkAuthError,
  getForgotPasswordAuthError,
} from '../authErrors'

// ---------------------------------------------------------------------------
// getRegisterAuthError — already covered; kept for regression
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// getLoginAuthError
// ---------------------------------------------------------------------------
describe('getLoginAuthError', () => {
  it('maps invalid-credential to wrong-credentials message (retryable)', () => {
    const info = getLoginAuthError({ code: 'auth/invalid-credential' })
    expect(info.message).toMatch(/correo o contraseña incorrectos/i)
    expect(info.isRetryable).toBe(true)
  })

  it('maps wrong-password to wrong-credentials message (retryable)', () => {
    const info = getLoginAuthError({ code: 'auth/wrong-password' })
    expect(info.message).toMatch(/correo o contraseña incorrectos/i)
    expect(info.isRetryable).toBe(true)
  })

  it('maps user-not-found to wrong-credentials message (retryable)', () => {
    const info = getLoginAuthError({ code: 'auth/user-not-found' })
    expect(info.message).toMatch(/correo o contraseña incorrectos/i)
    expect(info.isRetryable).toBe(true)
  })

  it('maps too-many-requests to a non-retryable cooldown message', () => {
    const info = getLoginAuthError({ code: 'auth/too-many-requests' })
    expect(info.message).toMatch(/demasiados intentos/i)
    expect(info.isRetryable).toBe(false)
  })

  it('maps user-disabled to a non-retryable disabled-account message', () => {
    const info = getLoginAuthError({ code: 'auth/user-disabled' })
    expect(info.message).toMatch(/desactivada/i)
    expect(info.isRetryable).toBe(false)
  })

  it('maps network-request-failed to a retryable connectivity message', () => {
    const info = getLoginAuthError({ code: 'auth/network-request-failed' })
    expect(info.message).toMatch(/conexión a internet/i)
    expect(info.isRetryable).toBe(true)
  })

  it('falls back to a generic retryable message for unknown codes', () => {
    const info = getLoginAuthError({ code: 'auth/unexpected' })
    expect(info.message).toMatch(/error al iniciar sesión/i)
    expect(info.isRetryable).toBe(true)
  })

  it('extracts auth/* code from an Error message string', () => {
    const info = getLoginAuthError(
      new Error('Firebase: Error (auth/user-disabled).')
    )
    expect(info.message).toMatch(/desactivada/i)
  })

  it('handles non-object errors by falling back to default', () => {
    const info = getLoginAuthError('some string error')
    expect(info.message).toMatch(/error al iniciar sesión/i)
    expect(info.isRetryable).toBe(true)
  })

  it('handles null by falling back to default', () => {
    const info = getLoginAuthError(null)
    expect(info.message).toMatch(/error al iniciar sesión/i)
    expect(info.isRetryable).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// getPhoneAuthError
// ---------------------------------------------------------------------------
describe('getPhoneAuthError', () => {
  it('maps invalid-phone-number to an invalid-format message (retryable)', () => {
    const info = getPhoneAuthError({ code: 'auth/invalid-phone-number' })
    expect(info.message).toMatch(/número de teléfono inválido/i)
    expect(info.isRetryable).toBe(true)
  })

  it('maps too-many-requests to a non-retryable cooldown message', () => {
    const info = getPhoneAuthError({ code: 'auth/too-many-requests' })
    expect(info.message).toMatch(/demasiados intentos/i)
    expect(info.isRetryable).toBe(false)
  })

  it('maps quota-exceeded to a non-retryable quota message', () => {
    const info = getPhoneAuthError({ code: 'auth/quota-exceeded' })
    expect(info.message).toMatch(/límite de verificaciones/i)
    expect(info.isRetryable).toBe(false)
  })

  it('maps invalid-verification-code to a retryable bad-code message', () => {
    const info = getPhoneAuthError({ code: 'auth/invalid-verification-code' })
    expect(info.message).toMatch(/código de verificación incorrecto/i)
    expect(info.isRetryable).toBe(true)
  })

  it('maps code-expired to a retryable resend message', () => {
    const info = getPhoneAuthError({ code: 'auth/code-expired' })
    expect(info.message).toMatch(/código expirado/i)
    expect(info.isRetryable).toBe(true)
  })

  it('maps session-expired to a retryable resend message', () => {
    const info = getPhoneAuthError({ code: 'auth/session-expired' })
    expect(info.message).toMatch(/código expirado/i)
    expect(info.isRetryable).toBe(true)
  })

  it('maps credential-already-in-use to a non-retryable duplicate message', () => {
    const info = getPhoneAuthError({ code: 'auth/credential-already-in-use' })
    expect(info.message).toMatch(/número ya está asociado/i)
    expect(info.isRetryable).toBe(false)
  })

  it('maps provider-already-linked to a non-retryable already-linked message', () => {
    const info = getPhoneAuthError({ code: 'auth/provider-already-linked' })
    expect(info.message).toMatch(/número vinculado/i)
    expect(info.isRetryable).toBe(false)
  })

  it('maps requires-recent-login to a non-retryable session-expired message', () => {
    const info = getPhoneAuthError({ code: 'auth/requires-recent-login' })
    expect(info.message).toMatch(/sesión ha expirado/i)
    expect(info.isRetryable).toBe(false)
  })

  it('maps captcha-check-failed to a retryable browser-blocking message with hint', () => {
    const info = getPhoneAuthError({ code: 'auth/captcha-check-failed' })
    expect(info.message).toMatch(/extensión|configuración de privacidad/i)
    expect(info.recoveryHint).toBeDefined()
    expect(info.isRetryable).toBe(true)
  })

  it('maps missing-client-identifier the same as captcha-check-failed', () => {
    const info = getPhoneAuthError({ code: 'auth/missing-client-identifier' })
    expect(info.message).toMatch(/extensión|configuración de privacidad/i)
    expect(info.recoveryHint).toBeDefined()
    expect(info.isRetryable).toBe(true)
  })

  it('maps network-request-failed to a retryable connectivity message', () => {
    const info = getPhoneAuthError({ code: 'auth/network-request-failed' })
    expect(info.message).toMatch(/conexión a internet/i)
    expect(info.isRetryable).toBe(true)
  })

  it('falls back to a generic retryable message for unknown codes', () => {
    const info = getPhoneAuthError({ code: 'auth/unknown-code' })
    expect(info.message).toMatch(/error al verificar/i)
    expect(info.isRetryable).toBe(true)
  })

  it('extracts auth/* code from an Error message string', () => {
    const info = getPhoneAuthError(
      new Error('Firebase: Error (auth/invalid-phone-number).')
    )
    expect(info.message).toMatch(/número de teléfono inválido/i)
  })
})

// ---------------------------------------------------------------------------
// getMagicLinkAuthError
// ---------------------------------------------------------------------------
describe('getMagicLinkAuthError', () => {
  it('maps too-many-requests to a non-retryable cooldown message', () => {
    const info = getMagicLinkAuthError({ code: 'auth/too-many-requests' })
    expect(info.message).toMatch(/demasiados intentos/i)
    expect(info.isRetryable).toBe(false)
  })

  it('maps unauthorized-domain to a non-retryable domain message', () => {
    const info = getMagicLinkAuthError({ code: 'auth/unauthorized-domain' })
    expect(info.message).toMatch(/dominio no autorizado/i)
    expect(info.isRetryable).toBe(false)
  })

  it('maps unauthorized-continue-uri to the same non-retryable domain message', () => {
    const info = getMagicLinkAuthError({ code: 'auth/unauthorized-continue-uri' })
    expect(info.message).toMatch(/dominio no autorizado/i)
    expect(info.isRetryable).toBe(false)
  })

  it('maps expired-action-code to a retryable expired-link message', () => {
    const info = getMagicLinkAuthError({ code: 'auth/expired-action-code' })
    expect(info.message).toMatch(/enlace ha expirado/i)
    expect(info.isRetryable).toBe(true)
  })

  it('maps invalid-action-code to a retryable expired-link message', () => {
    const info = getMagicLinkAuthError({ code: 'auth/invalid-action-code' })
    expect(info.message).toMatch(/enlace ha expirado/i)
    expect(info.isRetryable).toBe(true)
  })

  it('maps invalid-email to a retryable email-mismatch message', () => {
    const info = getMagicLinkAuthError({ code: 'auth/invalid-email' })
    expect(info.message).toMatch(/correo no coincide/i)
    expect(info.isRetryable).toBe(true)
  })

  it('maps network-request-failed to a retryable connectivity message', () => {
    const info = getMagicLinkAuthError({ code: 'auth/network-request-failed' })
    expect(info.message).toMatch(/conexión a internet/i)
    expect(info.isRetryable).toBe(true)
  })

  it('falls back to a generic retryable message for unknown codes', () => {
    const info = getMagicLinkAuthError({ code: 'auth/something-else' })
    expect(info.message).toMatch(/error al enviar el enlace/i)
    expect(info.isRetryable).toBe(true)
  })

  it('extracts auth/* code from an Error message string', () => {
    const info = getMagicLinkAuthError(
      new Error('Firebase: Error (auth/expired-action-code).')
    )
    expect(info.message).toMatch(/enlace ha expirado/i)
  })
})

// ---------------------------------------------------------------------------
// getForgotPasswordAuthError
// ---------------------------------------------------------------------------
describe('getForgotPasswordAuthError', () => {
  it('maps too-many-requests to a non-retryable cooldown message', () => {
    const info = getForgotPasswordAuthError({ code: 'auth/too-many-requests' })
    expect(info.message).toMatch(/demasiados intentos/i)
    expect(info.isRetryable).toBe(false)
  })

  it('does NOT reveal that the account is missing for auth/user-not-found (enumeration protection)', () => {
    const info = getForgotPasswordAuthError({ code: 'auth/user-not-found' })
    expect(info.message).not.toMatch(/no existe una cuenta/i)
    expect(info.message).toMatch(/verifica tu dirección/i)
  })

  it('maps functions/resource-exhausted to a rate-limit message', () => {
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

  it('maps network-request-failed to a retryable connectivity message', () => {
    const info = getForgotPasswordAuthError({ code: 'auth/network-request-failed' })
    expect(info.message).toMatch(/conexión a internet/i)
    expect(info.isRetryable).toBe(true)
  })

  it('falls back to the address-check message for unrecognized auth/* codes', () => {
    const info = getForgotPasswordAuthError({ code: 'auth/something-else' })
    expect(info.message).toMatch(/verifica tu dirección/i)
    expect(info.isRetryable).toBe(true)
  })

  it('handles undefined gracefully, falling back to default', () => {
    const info = getForgotPasswordAuthError(undefined)
    expect(info.message).toMatch(/error al enviar el correo/i)
    expect(info.isRetryable).toBe(true)
  })
})
