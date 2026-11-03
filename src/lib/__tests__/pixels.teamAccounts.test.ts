// @vitest-environment jsdom
// Team accounts never count in analytics (ADR-050, Jerson 2026-11-02).
// The Meta and TikTok pixels: not loaded for a team account, silenced if one
// signs in after they loaded, and back on after sign-out.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

type AnyWin = Record<string, unknown>

async function load() {
  vi.resetModules()
  vi.stubEnv('MODE', 'production')
  const suppression = await import('../analyticsSuppression')
  const meta = await import('../metaPixel')
  const tiktok = await import('../tiktokPixel')
  return { suppression, meta, tiktok }
}

beforeEach(() => {
  localStorage.clear()
  // Keep the loaders from inserting real <script> tags.
  const fakeScript = document.createElement('script')
  Object.defineProperty(fakeScript, 'parentNode', { value: { insertBefore: vi.fn() }, configurable: true })
  vi.spyOn(document, 'getElementsByTagName').mockReturnValue(
    [fakeScript] as unknown as HTMLCollectionOf<HTMLScriptElement>,
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  const w = window as unknown as AnyWin
  delete w.fbq
  delete w._fbq
  delete w.ttq
  delete w.TiktokAnalyticsObject
})

describe('page load, before sign-in is known', () => {
  it('waits: neither pixel loads (so no first PageView) until sign-in is known', async () => {
    const { meta, tiktok } = await load()
    meta.initMetaPixel()
    tiktok.initTikTokPixel()
    expect((window as unknown as AnyWin).fbq).toBeUndefined()
    expect((window as unknown as AnyWin).ttq).toBeUndefined()
  })

  it('loads both once a guest or non-team account is known', async () => {
    const { suppression, meta, tiktok } = await load()
    meta.initMetaPixel()
    tiktok.initTikTokPixel()
    suppression.applyAnalyticsAccount('vecino@gmail.com')
    expect((window as unknown as AnyWin).fbq).toBeDefined()
    expect((window as unknown as AnyWin).ttq).toBeDefined()
  })

  it('never loads them when a team account is signed in', async () => {
    const { suppression, meta, tiktok } = await load()
    meta.initMetaPixel()
    tiktok.initTikTokPixel()
    suppression.applyAnalyticsAccount('admin@oqupa.com')
    expect((window as unknown as AnyWin).fbq).toBeUndefined()
    expect((window as unknown as AnyWin).ttq).toBeUndefined()
  })

  it('a browser remembered as a team one does not load them at all', async () => {
    localStorage.setItem('oqupa:analytics-team-account', '1')
    const { meta, tiktok } = await load()
    meta.initMetaPixel()
    tiktok.initTikTokPixel()
    expect((window as unknown as AnyWin).fbq).toBeUndefined()
    expect((window as unknown as AnyWin).ttq).toBeUndefined()
  })

  it('a team account signing out loads them for the next person', async () => {
    const { suppression, meta, tiktok } = await load()
    meta.initMetaPixel()
    tiktok.initTikTokPixel()
    suppression.applyAnalyticsAccount('admin@oqupa.com')
    suppression.applyAnalyticsAccount(null)
    expect((window as unknown as AnyWin).fbq).toBeDefined()
    expect((window as unknown as AnyWin).ttq).toBeDefined()
  })
})

describe('a team account signs in after the pixels loaded', () => {
  it('Meta: consent is revoked, events are dropped; sign-out grants it back', async () => {
    const { suppression, meta } = await load()
    suppression.applyAnalyticsAccount(null)
    const fbq = vi.fn()
    vi.stubGlobal('fbq', fbq)
    meta.initMetaPixel() // fbq already present → loader keeps it

    suppression.applyAnalyticsAccount('sarahwalkerdev@gmail.com')
    expect(fbq).toHaveBeenCalledWith('consent', 'revoke')
    fbq.mockClear()
    meta.trackMeta('ViewContent', { content_ids: ['L1'] })
    meta.trackMetaCustom('ListingPublished')
    expect(fbq).not.toHaveBeenCalled()

    suppression.applyAnalyticsAccount(null)
    expect(fbq).toHaveBeenCalledWith('consent', 'grant')
    meta.trackMeta('ViewContent')
    expect(fbq).toHaveBeenCalledWith('track', 'ViewContent', undefined)
  })

  it('TikTok: consent is revoked, events are dropped; sign-out grants it back', async () => {
    const { suppression, tiktok } = await load()
    suppression.applyAnalyticsAccount(null)
    tiktok.initTikTokPixel()
    const ttq = (window as unknown as AnyWin).ttq as Record<string, unknown>
    const track = vi.fn()
    const revokeConsent = vi.fn()
    const grantConsent = vi.fn()
    Object.assign(ttq, { track, revokeConsent, grantConsent })

    suppression.applyAnalyticsAccount('kennethtquintana@gmail.com')
    expect(revokeConsent).toHaveBeenCalled()
    tiktok.trackTikTok('ViewContent')
    expect(track).not.toHaveBeenCalled()

    suppression.applyAnalyticsAccount(null)
    expect(grantConsent).toHaveBeenCalled()
    tiktok.trackTikTok('ViewContent')
    expect(track).toHaveBeenCalledWith('ViewContent', undefined)
  })
})
