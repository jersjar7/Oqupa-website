// Team accounts never count in analytics (ADR-050, Jerson 2026-11-02).
// While one is signed in, nothing reaches Google Analytics, Meta or TikTok.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  logEventMock,
  setUserPropertiesMock,
  setCollectionMock,
  trackMetaMock,
  trackMetaCustomMock,
  trackTikTokMock,
} = vi.hoisted(() => ({
  logEventMock: vi.fn(),
  setUserPropertiesMock: vi.fn(),
  setCollectionMock: vi.fn(),
  trackMetaMock: vi.fn(),
  trackMetaCustomMock: vi.fn(),
  trackTikTokMock: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({ analytics: { __analytics: true } }))
vi.mock('firebase/analytics', () => ({
  logEvent: (...a: unknown[]) => logEventMock(...a),
  setUserProperties: (...a: unknown[]) => setUserPropertiesMock(...a),
  setAnalyticsCollectionEnabled: (...a: unknown[]) => setCollectionMock(...a),
}))
vi.mock('@/lib/metaPixel', () => ({
  trackMeta: (...a: unknown[]) => trackMetaMock(...a),
  trackMetaCustom: (...a: unknown[]) => trackMetaCustomMock(...a),
}))
vi.mock('@/lib/tiktokPixel', () => ({
  trackTikTok: (...a: unknown[]) => trackTikTokMock(...a),
}))

import { AnalyticsLogger } from '../analytics'
import { applyAnalyticsAccount } from '../analyticsSuppression'

function fireEverything() {
  AnalyticsLogger.pageView('Home')
  AnalyticsLogger.listingViewed('L1', 'Piura')
  AnalyticsLogger.listingCreated('venta')
  AnalyticsLogger.loginCompleted('google')
  AnalyticsLogger.registrationCompleted()
  AnalyticsLogger.contactRevealed('L1')
  AnalyticsLogger.errorOccurred('x', 'y')
  AnalyticsLogger.realtorApplicationStarted()
  AnalyticsLogger.setUserProperties({ userSegment: 'owner' })
  AnalyticsLogger.clearUserProperties()
}

beforeEach(() => {
  vi.clearAllMocks()
  applyAnalyticsAccount(null)
  vi.clearAllMocks()
})

describe('a team account is signed in', () => {
  it('sends nothing to Google Analytics', () => {
    applyAnalyticsAccount('admin@oqupa.com')
    fireEverything()
    expect(logEventMock).not.toHaveBeenCalled()
    expect(setUserPropertiesMock).not.toHaveBeenCalled()
  })

  it('turns Google Analytics collection off, so its automatic events stop too', () => {
    applyAnalyticsAccount('Becjanmor@Gmail.com')
    expect(setCollectionMock).toHaveBeenLastCalledWith({ __analytics: true }, false)
  })

  it('sends nothing through the Meta or TikTok helpers', () => {
    applyAnalyticsAccount('jersondevs@gmail.com')
    fireEverything()
    expect(trackMetaMock).not.toHaveBeenCalled()
    expect(trackMetaCustomMock).not.toHaveBeenCalled()
    expect(trackTikTokMock).not.toHaveBeenCalled()
  })
})

describe('signing out', () => {
  it('turns collection back on and events flow for the next person', () => {
    applyAnalyticsAccount('admin@oqupa.com')
    applyAnalyticsAccount(null)
    expect(setCollectionMock).toHaveBeenLastCalledWith({ __analytics: true }, true)
    fireEverything()
    expect(logEventMock).toHaveBeenCalled()
    expect(setUserPropertiesMock).toHaveBeenCalled()
    expect(trackMetaMock).toHaveBeenCalled()
    expect(trackTikTokMock).toHaveBeenCalled()
  })
})

describe('a non-team account', () => {
  it('is measured as before', () => {
    applyAnalyticsAccount('vecina@gmail.com')
    AnalyticsLogger.pageView('Home')
    expect(logEventMock).toHaveBeenCalledWith({ __analytics: true }, 'page_view', { page_title: 'Home' })
  })
})
