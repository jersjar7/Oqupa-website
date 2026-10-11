// analytics.ts has no browser API dependencies — pure function calls
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { logEventMock, trackMetaMock, trackMetaCustomMock, trackTikTokMock } = vi.hoisted(() => ({
  logEventMock: vi.fn(),
  trackMetaMock: vi.fn(),
  trackMetaCustomMock: vi.fn(),
  trackTikTokMock: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  analytics: { __analytics: true },
}))

vi.mock('firebase/analytics', () => ({
  logEvent: (...args: unknown[]) => logEventMock(...args),
}))

vi.mock('@/lib/metaPixel', () => ({
  trackMeta: (...args: unknown[]) => trackMetaMock(...args),
  trackMetaCustom: (...args: unknown[]) => trackMetaCustomMock(...args),
}))

vi.mock('@/lib/tiktokPixel', () => ({
  trackTikTok: (...args: unknown[]) => trackTikTokMock(...args),
}))

import { AnalyticsLogger } from '../analytics'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AnalyticsLogger', () => {
  beforeEach(() => {
    logEventMock.mockReset()
    trackMetaMock.mockReset()
    trackMetaCustomMock.mockReset()
    trackTikTokMock.mockReset()
  })

  describe('pageView', () => {
    it('logs a page_view event with the page name', () => {
      AnalyticsLogger.pageView('Home')
      expect(logEventMock).toHaveBeenCalledWith(
        expect.anything(),
        'page_view',
        { page_title: 'Home' },
      )
    })

    it('does not call Meta or TikTok', () => {
      AnalyticsLogger.pageView('Explorar')
      expect(trackMetaMock).not.toHaveBeenCalled()
      expect(trackTikTokMock).not.toHaveBeenCalled()
    })
  })

  describe('listingViewed', () => {
    it('logs listing_viewed to GA with listingId', () => {
      AnalyticsLogger.listingViewed('listing-abc')
      expect(logEventMock).toHaveBeenCalledWith(
        expect.anything(),
        'listing_viewed',
        { listing_id: 'listing-abc' },
      )
    })

    it('sends ViewContent to Meta with content_ids', () => {
      AnalyticsLogger.listingViewed('listing-abc')
      expect(trackMetaMock).toHaveBeenCalledWith('ViewContent', {
        content_type: 'property',
        content_ids: ['listing-abc'],
      })
    })

    it('sends ViewContent to TikTok with content_id', () => {
      AnalyticsLogger.listingViewed('listing-abc')
      expect(trackTikTokMock).toHaveBeenCalledWith('ViewContent', {
        content_type: 'product',
        content_id: 'listing-abc',
      })
    })

    it('includes content_category in Meta when district is provided', () => {
      AnalyticsLogger.listingViewed('listing-abc', 'Miraflores')
      expect(trackMetaMock).toHaveBeenCalledWith('ViewContent', {
        content_type: 'property',
        content_ids: ['listing-abc'],
        content_category: 'Miraflores',
      })
    })

    it('includes content_category in TikTok when district is provided', () => {
      AnalyticsLogger.listingViewed('listing-abc', 'San Isidro')
      expect(trackTikTokMock).toHaveBeenCalledWith('ViewContent', {
        content_type: 'product',
        content_id: 'listing-abc',
        content_category: 'San Isidro',
      })
    })

    it('omits content_category when district is not provided', () => {
      AnalyticsLogger.listingViewed('listing-abc')
      const metaCall = trackMetaMock.mock.calls[0]![1] as Record<string, unknown>
      expect(Object.keys(metaCall)).not.toContain('content_category')
    })
  })

  describe('listingCreated', () => {
    it('logs listing_created to GA with operation_type', () => {
      AnalyticsLogger.listingCreated('venta')
      expect(logEventMock).toHaveBeenCalledWith(
        expect.anything(),
        'listing_created',
        { operation_type: 'venta' },
      )
    })

    it('sends ListingPublished custom event to Meta', () => {
      AnalyticsLogger.listingCreated('alquiler')
      expect(trackMetaCustomMock).toHaveBeenCalledWith('ListingPublished', {
        operation_type: 'alquiler',
      })
    })

    it('sends ListingPublished to TikTok', () => {
      AnalyticsLogger.listingCreated('venta')
      expect(trackTikTokMock).toHaveBeenCalledWith('ListingPublished', {
        operation_type: 'venta',
      })
    })
  })

  describe('loginCompleted', () => {
    it('logs login event with method', () => {
      AnalyticsLogger.loginCompleted('email')
      expect(logEventMock).toHaveBeenCalledWith(
        expect.anything(),
        'login',
        { method: 'email' },
      )
    })

    it('does not call Meta or TikTok', () => {
      AnalyticsLogger.loginCompleted('google')
      expect(trackMetaMock).not.toHaveBeenCalled()
      expect(trackTikTokMock).not.toHaveBeenCalled()
    })
  })

  describe('registrationCompleted', () => {
    it('logs sign_up to GA', () => {
      AnalyticsLogger.registrationCompleted()
      expect(logEventMock).toHaveBeenCalledWith(expect.anything(), 'sign_up')
    })

    it('sends CompleteRegistration to Meta', () => {
      AnalyticsLogger.registrationCompleted()
      expect(trackMetaMock).toHaveBeenCalledWith('CompleteRegistration')
    })

    it('sends CompleteRegistration to TikTok', () => {
      AnalyticsLogger.registrationCompleted()
      expect(trackTikTokMock).toHaveBeenCalledWith('CompleteRegistration')
    })
  })

  describe('contactRevealed', () => {
    it('logs contact_revealed to GA with listingId', () => {
      AnalyticsLogger.contactRevealed('listing-xyz')
      expect(logEventMock).toHaveBeenCalledWith(
        expect.anything(),
        'contact_revealed',
        { listing_id: 'listing-xyz' },
      )
    })

    it('sends Contact to Meta with content_ids', () => {
      AnalyticsLogger.contactRevealed('listing-xyz')
      expect(trackMetaMock).toHaveBeenCalledWith('Contact', {
        content_type: 'property',
        content_ids: ['listing-xyz'],
      })
    })

    it('sends Contact to TikTok with content_id', () => {
      AnalyticsLogger.contactRevealed('listing-xyz')
      expect(trackTikTokMock).toHaveBeenCalledWith('Contact', {
        content_type: 'product',
        content_id: 'listing-xyz',
      })
    })
  })

  describe('shareListing', () => {
    it('logs share_listing to GA with listingId and method', () => {
      AnalyticsLogger.shareListing('listing-abc', 'whatsapp')
      expect(logEventMock).toHaveBeenCalledWith(
        expect.anything(),
        'share_listing',
        { listing_id: 'listing-abc', share_method: 'whatsapp' },
      )
    })

    it('does not call Meta or TikTok', () => {
      AnalyticsLogger.shareListing('listing-abc', 'copy')
      expect(trackMetaMock).not.toHaveBeenCalled()
      expect(trackTikTokMock).not.toHaveBeenCalled()
    })
  })

  describe('errorOccurred', () => {
    it('logs app_error to GA with truncated message and component name', () => {
      AnalyticsLogger.errorOccurred('Something went wrong', 'ListingPage')
      expect(logEventMock).toHaveBeenCalledWith(
        expect.anything(),
        'app_error',
        { error_message: 'Something went wrong', component: 'ListingPage' },
      )
    })

    it('truncates error message to 100 characters', () => {
      const longMessage = 'x'.repeat(200)
      AnalyticsLogger.errorOccurred(longMessage, 'ErrorBoundary')
      const args = logEventMock.mock.calls[0]![2] as { error_message: string }
      expect(args.error_message).toHaveLength(100)
    })

    it('does not call Meta or TikTok', () => {
      AnalyticsLogger.errorOccurred('error', 'Component')
      expect(trackMetaMock).not.toHaveBeenCalled()
      expect(trackTikTokMock).not.toHaveBeenCalled()
    })
  })
})
