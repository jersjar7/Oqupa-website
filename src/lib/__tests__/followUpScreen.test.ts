// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { FOLLOW_UP_CARD_ATTR, isFollowUpRoute, isScreenClearForFollowUp } from '../followUpScreen'

// "The screen is clear" for the A11b card on the website — the web version of
// the app's ContactFollowUpScreenGuard: only ordinary pages, never sign-in,
// the account pipeline, a form, or under another dialog / payment.

describe('isFollowUpRoute', () => {
  it.each([
    '/',
    '/explorar',
    '/guardados',
    '/property/abc123',
    '/app',
    '/app/',
    '/app/listings',
    '/app/leads',
    '/app/leads/x1',
    '/app/payments',
    '/app/lists',
    '/app/lists/l1',
  ])('%s is an ordinary page', (path) => {
    expect(isFollowUpRoute(path)).toBe(true)
  })

  it.each([
    '/app/login',
    '/app/register',
    '/app/forgot-password',
    '/app/verify',
    '/app/auth/complete',
    '/app/auth/set-password',
    '/app/listings/new',
    '/app/listings/abc/edit',
    '/app/listings/abc/agent-edit',
    '/app/listings/abc/agents',
    '/app/profile',
    '/app/realtor-registration',
    '/reportar',
    '/app/numbers',
    '/app/equipo',
    '/app/contenido',
    '/app/admin/applications',
    '/privacy',
    '/no-existe',
  ])('%s is not', (path) => {
    expect(isFollowUpRoute(path)).toBe(false)
  })
})

describe('isScreenClearForFollowUp', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('an empty page is clear', () => {
    expect(isScreenClearForFollowUp(document)).toBe(true)
  })

  it.each([
    ['an open <dialog> (Modal, Stripe payment)', '<dialog open><p>Pago seguro</p></dialog>'],
    ['an aria-modal overlay (boost checkout)', '<div aria-modal="true"></div>'],
    ['a role=dialog sheet (listing sheet, filters, the contact gate)', '<div role="dialog"></div>'],
  ])('%s is not clear', (_desc, html) => {
    document.body.innerHTML = html
    expect(isScreenClearForFollowUp(document)).toBe(false)
  })

  it('a closed <dialog> does not count', () => {
    document.body.innerHTML = '<dialog></dialog>'
    expect(isScreenClearForFollowUp(document)).toBe(true)
  })

  it('the follow-up card itself does not count', () => {
    document.body.innerHTML = `<dialog open ${FOLLOW_UP_CARD_ATTR}><div role="dialog"></div></dialog>`
    expect(isScreenClearForFollowUp(document)).toBe(true)
  })

  it('someone typing in a field is not clear', () => {
    document.body.innerHTML = '<input id="f" /><textarea id="t"></textarea><button id="b">x</button>'
    ;(document.getElementById('f') as HTMLInputElement).focus()
    expect(isScreenClearForFollowUp(document)).toBe(false)
    ;(document.getElementById('t') as HTMLTextAreaElement).focus()
    expect(isScreenClearForFollowUp(document)).toBe(false)
    ;(document.getElementById('b') as HTMLButtonElement).focus()
    expect(isScreenClearForFollowUp(document)).toBe(true)
  })
})
