// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { initTikTokPixel, trackTikTok, __testing } from '../tiktokPixel'

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
