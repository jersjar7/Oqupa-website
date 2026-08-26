// The WhatsApp gate copy. Pinned word for word to the app's
// test/ui/shared/contact_gate_modal_test.dart — both apps must say the same
// thing (auth-change Gate 3). Approved: docs/new-user-navigation-path.md.
import { describe, it, expect } from 'vitest'
import { contactGateCopy } from '../contactGate'

describe('contactGateCopy', () => {
  it('visitor: says why, says it is free, offers to create an account', () => {
    const c = contactGateCopy({ signedIn: false, emailVerified: false })
    expect(c.body).toBe(
      'Para escribirle al propietario, crea tu cuenta y verifica tu número. Es gratis y toma unos minutos.',
    )
    expect(c.primary).toEqual({ label: 'CREA TU CUENTA', to: '/app/register' })
    expect(c.secondary).toEqual({ label: 'Ya tengo cuenta', to: '/app/login' })
    expect(c.body).not.toMatch(/necesitas|esta función/)
  })

  it('signed in but phone unverified: asks only for the phone, once', () => {
    const c = contactGateCopy({ signedIn: true, emailVerified: true })
    expect(c.body).toBe('Para escribirle al propietario, verifica tu número. Solo esta vez.')
    expect(c.primary).toEqual({ label: 'VERIFICAR NÚMERO', to: '/app/verify' })
    expect(c.secondary).toBeNull()
  })

  it('signed in with the email still unverified: does not promise a single step', () => {
    // Hostile review 2026-08-26: /app/verify walks this person through email
    // (and possibly name) before the phone, so "Solo esta vez" would be false.
    const c = contactGateCopy({ signedIn: true, emailVerified: false })
    expect(c.body).toBe('Para escribirle al propietario, termina de verificar tu cuenta.')
    expect(c.primary).toEqual({ label: 'VERIFICAR CUENTA', to: '/app/verify' })
    expect(c.secondary).toBeNull()
  })

  it('the title talks about the action, not about verification', () => {
    expect(contactGateCopy({ signedIn: false, emailVerified: false }).title).toBe('Escríbele al propietario')
    expect(contactGateCopy({ signedIn: true, emailVerified: true }).title).toBe('Escríbele al propietario')
  })
})
