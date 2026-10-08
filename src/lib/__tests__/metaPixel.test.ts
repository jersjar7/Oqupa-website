// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { initMetaPixel, trackMeta, trackMetaCustom, __testing } from '../metaPixel'

// ── Production-mode helper ────────────────────────────────────────────────────

async function importInProductionMode() {
  vi.resetModules()
  vi.stubEnv('MODE', 'production')
  return import('../metaPixel')
}

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

// ── Production-mode tests (MODE === 'production') ─────────────────────────────

describe('initMetaPixel — production mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
    delete (window as unknown as Record<string, unknown>).fbq
    delete (window as unknown as Record<string, unknown>)._fbq
  })

  it('sets window.fbq in production', async () => {
    const { initMetaPixel: init } = await importInProductionMode()
    // Stub <script> insertion to avoid actually loading fbevents.js
    const origGetElements = document.getElementsByTagName.bind(document)
    vi.spyOn(document, 'getElementsByTagName').mockImplementation((tag: string) => {
      if (tag === 'script') {
        const fakeScript = origGetElements('script')[0] ?? document.createElement('script')
        const fakeParent = { insertBefore: vi.fn() }
        Object.defineProperty(fakeScript, 'parentNode', { value: fakeParent, configurable: true })
        return [fakeScript] as unknown as HTMLCollectionOf<Element>
      }
      return origGetElements(tag)
    })
    init()
    expect((window as unknown as Record<string, unknown>).fbq).toBeDefined()
  })

  it('does not reinitialize when called multiple times (started guard)', async () => {
    const { initMetaPixel: init } = await importInProductionMode()
    // Provide a fake script with a parentNode so insertBefore does not throw
    const fakeScript = document.createElement('script')
    const fakeParent = { insertBefore: vi.fn() }
    Object.defineProperty(fakeScript, 'parentNode', { value: fakeParent, configurable: true })
    vi.spyOn(document, 'getElementsByTagName').mockReturnValue(
      [fakeScript] as unknown as HTMLCollectionOf<HTMLScriptElement>
    )
    init()
    const fbqAfterFirst = (window as unknown as Record<string, unknown>).fbq
    init()
    expect((window as unknown as Record<string, unknown>).fbq).toBe(fbqAfterFirst)
  })

  it('does not set fbq again when window.fbq already exists (pixel already loaded)', async () => {
    const { initMetaPixel: init } = await importInProductionMode()
    const existingFbq = vi.fn()
    vi.stubGlobal('fbq', existingFbq)
    vi.spyOn(document, 'getElementsByTagName').mockReturnValue(
      [] as unknown as HTMLCollectionOf<HTMLScriptElement>
    )
    vi.spyOn(document.documentElement, 'appendChild').mockReturnValue(document.createElement('script'))
    init()
    // When window.fbq already exists, the IIFE returns early; fbq stays as the existing one
    expect((window as unknown as Record<string, unknown>).fbq).toBe(existingFbq)
  })

  it('calls callMethod when fbq is invoked after the script has set it (line 61 true branch)', async () => {
    const { initMetaPixel: init } = await importInProductionMode()
    const fakeScript = document.createElement('script')
    const parentNode = { insertBefore: vi.fn() }
    Object.defineProperty(fakeScript, 'parentNode', { value: parentNode, configurable: true })
    vi.spyOn(document, 'getElementsByTagName').mockReturnValue(
      [fakeScript] as unknown as HTMLCollectionOf<HTMLScriptElement>
    )
    init()

    // Simulate Meta's SDK landing: it sets callMethod on fbq after script loads
    const fbq = (window as unknown as Record<string, unknown>).fbq as Record<string, unknown> & ((...args: unknown[]) => void)
    const callMethodSpy = vi.fn()
    fbq.callMethod = callMethodSpy

    // Calling fbq now routes through the callMethod branch (line 61 true branch)
    fbq('track', 'TestEvent')
    expect(callMethodSpy).toHaveBeenCalledWith('track', 'TestEvent')
  })

  it('does not overwrite _fbq when it already exists before init (line 63 false branch)', async () => {
    const { initMetaPixel: init } = await importInProductionMode()
    // Set _fbq (but NOT fbq) so the IIFE does not early-return at line 59
    const existingInternalFbq = vi.fn()
    ;(window as unknown as Record<string, unknown>)._fbq = existingInternalFbq

    const fakeScript = document.createElement('script')
    const parentNode = { insertBefore: vi.fn() }
    Object.defineProperty(fakeScript, 'parentNode', { value: parentNode, configurable: true })
    vi.spyOn(document, 'getElementsByTagName').mockReturnValue(
      [fakeScript] as unknown as HTMLCollectionOf<HTMLScriptElement>
    )
    init()

    // line 63: if (!f._fbq) f._fbq = n — false branch taken since _fbq was already set
    expect((window as unknown as Record<string, unknown>)._fbq).toBe(existingInternalFbq)
  })
})

describe('trackMeta — production mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
    delete (window as unknown as Record<string, unknown>).fbq
  })

  it('calls window.fbq("track", event, params) in production', async () => {
    const { trackMeta: track } = await importInProductionMode()
    const fbqSpy = vi.fn()
    vi.stubGlobal('fbq', fbqSpy)
    track('ViewContent', { content_type: 'property' })
    expect(fbqSpy).toHaveBeenCalledWith('track', 'ViewContent', { content_type: 'property' })
  })

  it('does not throw in production when fbq is undefined', async () => {
    const { trackMeta: track } = await importInProductionMode()
    expect(() => track('ViewContent')).not.toThrow()
  })

  it('swallows errors from fbq in production (catch block)', async () => {
    const { trackMeta: track } = await importInProductionMode()
    vi.stubGlobal('fbq', vi.fn(() => { throw new Error('blocked') }))
    expect(() => track('PageView')).not.toThrow()
  })
})

describe('trackMetaCustom — production mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
    delete (window as unknown as Record<string, unknown>).fbq
  })

  it('calls window.fbq("trackCustom", event, params) in production', async () => {
    const { trackMetaCustom: trackCustom } = await importInProductionMode()
    const fbqSpy = vi.fn()
    vi.stubGlobal('fbq', fbqSpy)
    trackCustom('ListingPublished', { operation_type: 'venta' })
    expect(fbqSpy).toHaveBeenCalledWith('trackCustom', 'ListingPublished', { operation_type: 'venta' })
  })

  it('does not throw in production when fbq is undefined', async () => {
    const { trackMetaCustom: trackCustom } = await importInProductionMode()
    expect(() => trackCustom('CustomEvent')).not.toThrow()
  })

  it('swallows errors from fbq in production (catch block)', async () => {
    const { trackMetaCustom: trackCustom } = await importInProductionMode()
    vi.stubGlobal('fbq', vi.fn(() => { throw new Error('blocked') }))
    expect(() => trackCustom('ListingPublished')).not.toThrow()
  })
})
