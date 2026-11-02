// @vitest-environment jsdom
// Third hostile review #3: a session that ends on a freshly loaded page must
// still bind the way back to the account that was signed in on this tab.
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('the bounced account survives a page load', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('signed in before the reload, bounced after it: the way back is bound to that account', async () => {
    vi.resetModules()
    let rp = await import('../returnPath')
    rp.noteSignedInAccount('ana')
    vi.resetModules() // the page reloads: module memory is gone
    rp = await import('../returnPath')
    rp.rememberBouncedFrom({ pathname: '/app/listings/new' })
    expect(rp.consumeBouncedFor('beto')).toBeNull()
    rp.rememberBouncedFrom({ pathname: '/app/listings/new' })
    expect(rp.consumeBouncedFor('ana')).toBe('/app/listings/new')
  })

  it('a deliberate sign-out forgets the account', async () => {
    vi.resetModules()
    const rp = await import('../returnPath')
    rp.noteSignedInAccount('ana')
    rp.noteDeliberateSignOut()
    localStorage.removeItem('oqupa_signedOutOnPurposeAt')
    rp.rememberBouncedFrom({ pathname: '/app/listings/new' })
    expect(localStorage.getItem('oqupa_bouncedFrom')).toBeNull()
  })
})
