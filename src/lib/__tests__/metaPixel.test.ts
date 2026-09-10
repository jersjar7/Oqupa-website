// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { initMetaPixel, trackMeta, trackMetaCustom, __testing } from '../metaPixel'

// In test mode, MODE is never 'production', so isProduction is always false.
// All exported functions have production-only guards — the tests below pin
// that those guards work correctly (no side-effects in non-production) and
// verify the __testing constants that the rest of the codebase relies on.

afterEach(() => {
  vi.unstubAllGlobals()
  // Remove any fbq stub added during tests
  delete (window as unknown as Record<string, unknown>).fbq
})

describe('__testing export', () => {
  it('DATASET_ID is the expected Meta pixel id', () => {
    expect(__testing.DATASET_ID).toBe('4589259354641565')
  })

  it('isProduction is false in the test environment', () => {
    // In test mode (Vitest), MODE is never 'production'
    expect(__testing.isProduction).toBe(false)
  })
})

describe('initMetaPixel — non-production guard', () => {
  it('does not set window.fbq in non-production', () => {
    initMetaPixel()
    expect((window as unknown as Record<string, unknown>).fbq).toBeUndefined()
  })

  it('is safe to call multiple times without throwing', () => {
    expect(() => {
      initMetaPixel()
      initMetaPixel()
      initMetaPixel()
    }).not.toThrow()
  })
})

describe('trackMeta — non-production guard', () => {
  it('does not call window.fbq in non-production', () => {
    const fbqSpy = vi.fn()
    vi.stubGlobal('fbq', fbqSpy)

    trackMeta('ViewContent', { content_type: 'property' })

    // The production guard returns early before calling fbq
    expect(fbqSpy).not.toHaveBeenCalled()
  })

  it('does not throw when window.fbq is undefined', () => {
    expect(() => trackMeta('ViewContent')).not.toThrow()
  })

  it('does not throw when called with no params', () => {
    expect(() => trackMeta('PageView')).not.toThrow()
  })
})

describe('trackMetaCustom — non-production guard', () => {
  it('does not call window.fbq in non-production', () => {
    const fbqSpy = vi.fn()
    vi.stubGlobal('fbq', fbqSpy)

    trackMetaCustom('ListingPublished', { operation_type: 'venta' })

    expect(fbqSpy).not.toHaveBeenCalled()
  })

  it('does not throw when window.fbq is undefined', () => {
    expect(() => trackMetaCustom('CustomEvent')).not.toThrow()
  })
})
