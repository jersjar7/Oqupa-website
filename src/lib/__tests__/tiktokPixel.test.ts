// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { initTikTokPixel, trackTikTok, __testing } from '../tiktokPixel'

// ── Production-mode helpers ───────────────────────────────────────────────────
//
// initTikTokPixel and trackTikTok are gated on a module-level `isProduction`
// const. The only way to exercise the production branches is to reload the
// module after setting MODE='production'.

async function importInProductionMode() {
  vi.resetModules()
  vi.stubEnv('MODE', 'production')
  return import('../tiktokPixel')
}

// In test mode, MODE is never 'production', so isProduction is always false.
// Functions are production-only; tests verify early-return behaviour (no
// side-effects) and the __testing constants.

afterEach(() => {
  vi.unstubAllGlobals()
  delete (window as unknown as Record<string, unknown>).ttq
  delete (window as unknown as Record<string, unknown>).TiktokAnalyticsObject
})

describe('__testing export', () => {
  it('PIXEL_ID is the expected TikTok pixel id', () => {
    expect(__testing.PIXEL_ID).toBe('DA072E3C77U1IFUQUTEG')
  })

  it('isProduction is false in the test environment', () => {
    expect(__testing.isProduction).toBe(false)
  })
})

describe('initTikTokPixel — non-production guard', () => {
  it('does not set window.ttq in non-production', () => {
    initTikTokPixel()
    expect((window as unknown as Record<string, unknown>).ttq).toBeUndefined()
  })

  it('does not set TiktokAnalyticsObject in non-production', () => {
    initTikTokPixel()
    expect((window as unknown as Record<string, unknown>).TiktokAnalyticsObject).toBeUndefined()
  })

  it('is safe to call multiple times without throwing', () => {
    expect(() => {
      initTikTokPixel()
      initTikTokPixel()
    }).not.toThrow()
  })
})

describe('trackTikTok — non-production guard', () => {
  it('does not call window.ttq.track in non-production', () => {
    const trackSpy = vi.fn()
    vi.stubGlobal('ttq', { track: trackSpy })

    trackTikTok('ViewContent', { content_type: 'product' })

    expect(trackSpy).not.toHaveBeenCalled()
  })

  it('does not throw when window.ttq is undefined', () => {
    expect(() => trackTikTok('ViewContent')).not.toThrow()
  })

  it('does not throw when called with no params', () => {
    expect(() => trackTikTok('PageView')).not.toThrow()
  })
})

// ── Production-mode tests (MODE === 'production') ─────────────────────────────

describe('initTikTokPixel — production mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
    delete (window as unknown as Record<string, unknown>).ttq
    delete (window as unknown as Record<string, unknown>).TiktokAnalyticsObject
  })

  it('sets window.TiktokAnalyticsObject to "ttq" in production', async () => {
    const { initTikTokPixel: init } = await importInProductionMode()
    // Suppress the <script> insertion — it would try to insert into document
    vi.spyOn(document, 'getElementsByTagName').mockReturnValue([] as unknown as HTMLCollectionOf<HTMLScriptElement>)
    vi.spyOn(document.head, 'appendChild').mockReturnValue(document.createElement('script'))
    init()
    expect((window as unknown as Record<string, unknown>).TiktokAnalyticsObject).toBe('ttq')
  })

  it('does not reinitialize when called a second time (started guard)', async () => {
    const { initTikTokPixel: init } = await importInProductionMode()
    vi.spyOn(document, 'getElementsByTagName').mockReturnValue([] as unknown as HTMLCollectionOf<HTMLScriptElement>)
    vi.spyOn(document.head, 'appendChild').mockReturnValue(document.createElement('script'))
    init()
    const ttqAfterFirst = (window as unknown as Record<string, unknown>).ttq
    init() // second call should be a no-op (started = true)
    expect((window as unknown as Record<string, unknown>).ttq).toBe(ttqAfterFirst)
  })

  it('inserts a TikTok script tag into the document in production', async () => {
    const { initTikTokPixel: init } = await importInProductionMode()
    const appendChildSpy = vi.spyOn(document.head, 'appendChild').mockReturnValue(document.createElement('script'))
    vi.spyOn(document, 'getElementsByTagName').mockReturnValue([] as unknown as HTMLCollectionOf<HTMLScriptElement>)
    init()
    expect(appendChildSpy).toHaveBeenCalled()
  })

  it('inserts script before the first existing script tag when one exists', async () => {
    const { initTikTokPixel: init } = await importInProductionMode()
    const existingScript = document.createElement('script')
    const parentNode = { insertBefore: vi.fn() }
    Object.defineProperty(existingScript, 'parentNode', { value: parentNode, configurable: true })
    vi.spyOn(document, 'getElementsByTagName').mockReturnValue(
      [existingScript] as unknown as HTMLCollectionOf<HTMLScriptElement>
    )
    init()
    expect(parentNode.insertBefore).toHaveBeenCalled()
  })

  it('ttq.instance() returns a method-equipped array for a given pixel id (lines 79-81)', async () => {
    // Exercises lines 79-81: the body of the ttq.instance function
    const { initTikTokPixel: init } = await importInProductionMode()
    const fakeScript = document.createElement('script')
    const parentNode = { insertBefore: vi.fn() }
    Object.defineProperty(fakeScript, 'parentNode', { value: parentNode, configurable: true })
    vi.spyOn(document, 'getElementsByTagName').mockReturnValue(
      [fakeScript] as unknown as HTMLCollectionOf<HTMLScriptElement>
    )
    init()
    // After init, window.ttq.instance is available. Call it to execute lines 79-81.
    const ttq = (window as unknown as { ttq: { instance: (id: string) => unknown[]; _i: Record<string, unknown> } }).ttq
    const result = ttq.instance('DA072E3C77U1IFUQUTEG')
    // instance() returns an array with stub methods attached
    expect(Array.isArray(result)).toBe(true)
  })

  it('instance() with an unknown id falls back to [] when _i[id] is undefined (line 79 || [] branch)', async () => {
    const { initTikTokPixel: init } = await importInProductionMode()
    const fakeScript = document.createElement('script')
    const parentNode = { insertBefore: vi.fn() }
    Object.defineProperty(fakeScript, 'parentNode', { value: parentNode, configurable: true })
    vi.spyOn(document, 'getElementsByTagName').mockReturnValue(
      [fakeScript] as unknown as HTMLCollectionOf<HTMLScriptElement>
    )
    init()
    const ttq = (window as unknown as { ttq: { instance: (id: string) => unknown[] } }).ttq
    // 'UNKNOWN_ID' was never loaded so _i['UNKNOWN_ID'] is undefined → || [] fires
    const result = ttq.instance('UNKNOWN_ID')
    expect(Array.isArray(result)).toBe(true)
  })
})

describe('trackTikTok — production mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.resetModules()
    delete (window as unknown as Record<string, unknown>).ttq
  })

  it('calls window.ttq.track in production when ttq is available', async () => {
    const { trackTikTok: track } = await importInProductionMode()
    const trackSpy = vi.fn()
    vi.stubGlobal('ttq', { track: trackSpy })
    track('ViewContent', { content_type: 'product' })
    expect(trackSpy).toHaveBeenCalledWith('ViewContent', { content_type: 'product' })
  })

  it('does not throw when window.ttq is undefined in production', async () => {
    const { trackTikTok: track } = await importInProductionMode()
    expect(() => track('PageView')).not.toThrow()
  })

  it('does not throw when window.ttq.track throws (error is swallowed)', async () => {
    const { trackTikTok: track } = await importInProductionMode()
    vi.stubGlobal('ttq', {
      track: vi.fn(() => { throw new Error('blocked by ad blocker') }),
    })
    expect(() => track('ViewContent')).not.toThrow()
  })

  it('calls track with no params when params argument is omitted', async () => {
    const { trackTikTok: track } = await importInProductionMode()
    const trackSpy = vi.fn()
    vi.stubGlobal('ttq', { track: trackSpy })
    track('PageView')
    expect(trackSpy).toHaveBeenCalledWith('PageView', undefined)
  })
})

