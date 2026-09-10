// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatPrice, setReturnUrl, consumeReturnUrl, getPlatform } from '../utils'

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
