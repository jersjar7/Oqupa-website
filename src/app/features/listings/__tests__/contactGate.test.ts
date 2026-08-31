// The WhatsApp gate copy. Pinned word for word to the app's
// test/ui/shared/contact_gate_modal_test.dart — both apps must say the same
// thing (auth-change Gate 3). Approved: docs/new-user-navigation-path.md.
import { describe, it, expect } from 'vitest'
import { contactGateCopy, contactReturnUrl, wantsAutoContact } from '../contactGate'

describe('contactGateCopy', () => {
  it('visitor: says why, says it is free, offers to create an account', () => {
    const c = contactGateCopy({ signedIn: false, emailVerified: false })
    expect(c.body).toBe(
      'Para escribirle al propietario, crea tu cuenta y verifica tu número. Es gratis y toma unos minutos.',
    )
    expect(c.primary).toEqual({ label: 'CREA TU CUENTA', to: '/app/login' })
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

describe('the return address carries the intent', () => {
  it('stashes the listing with #contactar', () => {
    expect(contactReturnUrl('/property/abc')).toBe('/property/abc#contactar')
  })
  it('only that exact hash triggers the automatic contact', () => {
    expect(wantsAutoContact('#contactar')).toBe(true)
    expect(wantsAutoContact('')).toBe(false)
    expect(wantsAutoContact('#contactar2')).toBe(false)
  })
})

describe('the phone was never really linked', () => {
  // Staging, 2026-08-27, observed rather than imagined: an account whose
  // profile page says "Teléfono verificado" was refused the number, and the
  // page showed "No se pudo obtener el contacto. Intenta de nuevo." — which
  // is wrong twice over. Retrying cannot help, and the person is looking at a
  // screen that says they ARE verified.
  //
  // The server had refused with its own code (the Firestore flag says
  // verified; Firebase Auth has no phone attached). The app learned that code
  // when it shipped; the website never did, so every such refusal fell into
  // the generic bucket. Same words, both apps, is the rule this broke.
  it('tells them the number needs verifying again, and where to do it', () => {
    const c = contactGateCopy({
      signedIn: true,
      emailVerified: true,
      phoneNeedsReverification: true,
    })
    expect(c.body).toBe(
      'Para escribirle al propietario, verifica tu número otra vez.',
    )
    // ?reverify=phone is load-bearing, not decoration. /app/verify computes
    // what is owed from users/{uid}.isPhoneVerified — the very flag the server
    // has just told us not to believe — so without it the page finds nothing
    // to ask, "finishes" immediately, returns to the listing, and the stored
    // return address fires the contact call again. Observed on staging
    // 2026-08-27: the button appeared to do nothing, and each press added
    // another 409 to the console.
    expect(c.primary).toEqual({
      label: 'VERIFICAR NÚMERO',
      to: '/app/verify?reverify=phone',
    })
  })

  it('outranks the email wording — the phone is what the server refused on', () => {
    const c = contactGateCopy({
      signedIn: true,
      emailVerified: false,
      phoneNeedsReverification: true,
    })
    expect(c.body).toContain('verifica tu número otra vez')
  })

  it('leaves the ordinary cases untouched', () => {
    const c = contactGateCopy({ signedIn: true, emailVerified: true })
    expect(c.body).toBe(
      'Para escribirle al propietario, verifica tu número. Solo esta vez.',
    )
  })
})
