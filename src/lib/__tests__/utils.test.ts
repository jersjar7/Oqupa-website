// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatPrice, setReturnUrl, consumeReturnUrl, peekReturnUrl, getPlatform } from '../utils'

// ---------------------------------------------------------------------------
// formatPrice — pure function, no browser API
// ---------------------------------------------------------------------------
describe('formatPrice', () => {
  it('returns "Precio no disponible" when no price is given', () => {
    expect(formatPrice()).toBe('Precio no disponible')
  })

  it('returns "Precio no disponible" for 0', () => {
    expect(formatPrice(0)).toBe('Precio no disponible')
  })

  it('formats a whole number with S/. prefix', () => {
    const result = formatPrice(100000)
    expect(result).toMatch(/^S\/\./)
    expect(result).toContain('100')
  })

  it('formats a small price', () => {
    const result = formatPrice(500)
    expect(result).toMatch(/^S\/\./)
    expect(result).toContain('500')
  })
})

// ---------------------------------------------------------------------------
// setReturnUrl / consumeReturnUrl — localStorage
// ---------------------------------------------------------------------------
describe('setReturnUrl / consumeReturnUrl', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('consumeReturnUrl returns null when nothing was set', () => {
    expect(consumeReturnUrl()).toBeNull()
  })

  it('setReturnUrl persists and consumeReturnUrl retrieves the URL', () => {
    setReturnUrl('/app/listings/123')
    expect(consumeReturnUrl()).toBe('/app/listings/123')
  })

  it('consumeReturnUrl removes the key after first read (consume semantics)', () => {
    setReturnUrl('/some/path')
    consumeReturnUrl() // first read removes it
    expect(consumeReturnUrl()).toBeNull()
  })

  it('overwrites the saved URL if setReturnUrl is called twice', () => {
    setReturnUrl('/first')
    setReturnUrl('/second')
    expect(consumeReturnUrl()).toBe('/second')
  })

  it('returns the raw string when the stored value is a legacy plain path (not JSON)', () => {
    localStorage.setItem('oqupa_returnUrl', '/legacy/path')
    expect(consumeReturnUrl()).toBe('/legacy/path')
  })

  it('returns null when the stored value is a legacy plain string that does not start with /', () => {
    localStorage.setItem('oqupa_returnUrl', 'legacy-no-slash')
    expect(consumeReturnUrl()).toBeNull()
  })

  it('returns null when the stored return URL has exceeded the 30-minute TTL', () => {
    const expiredAt = Date.now() - 31 * 60 * 1000
    localStorage.setItem('oqupa_returnUrl', JSON.stringify({ url: '/old-path', at: expiredAt }))
    expect(consumeReturnUrl()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// peekReturnUrl — read-only (metrics plan A10)
// ---------------------------------------------------------------------------
describe('peekReturnUrl', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns the stored URL and when it was stored, without removing it', () => {
    const storedAt = Date.now() - 60_000
    vi.spyOn(Date, 'now').mockReturnValue(storedAt)
    setReturnUrl('/property/abc#contactar')
    vi.restoreAllMocks()
    expect(peekReturnUrl()).toEqual({ url: '/property/abc#contactar', at: storedAt })
    // Still there for the pipeline to consume.
    expect(consumeReturnUrl()).toBe('/property/abc#contactar')
  })

  it('returns null when nothing was stored', () => {
    expect(peekReturnUrl()).toBeNull()
  })

  it('returns null for an expired address and leaves it alone', () => {
    const expiredAt = Date.now() - 31 * 60 * 1000
    localStorage.setItem('oqupa_returnUrl', JSON.stringify({ url: '/old', at: expiredAt }))
    expect(peekReturnUrl()).toBeNull()
    expect(localStorage.getItem('oqupa_returnUrl')).not.toBeNull()
  })

  it('returns null for a legacy plain-string value (it has no time to key on)', () => {
    localStorage.setItem('oqupa_returnUrl', '/legacy/path')
    expect(peekReturnUrl()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getPlatform — reads navigator.userAgent
// ---------------------------------------------------------------------------
describe('getPlatform', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns "ios" for an iPhone user agent', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' })
    expect(getPlatform()).toBe('ios')
  })

  it('returns "ios" for an iPad user agent', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0)' })
    expect(getPlatform()).toBe('ios')
  })

  it('returns "ios" for an iPod user agent', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0)' })
    expect(getPlatform()).toBe('ios')
  })

  it('returns "android" for an Android user agent', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 14)' })
    expect(getPlatform()).toBe('android')
  })

  it('returns "desktop" for a Chrome desktop user agent', () => {
    vi.stubGlobal('navigator', {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    })
    expect(getPlatform()).toBe('desktop')
  })

  it('returns "desktop" when the user agent is an empty string', () => {
    vi.stubGlobal('navigator', { userAgent: '' })
    expect(getPlatform()).toBe('desktop')
  })
})
