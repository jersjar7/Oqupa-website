// analytics.ts has no browser API dependencies — pure function calls
import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  logEventMock,
  setUserPropertiesMock,
  trackMetaMock,
  trackMetaCustomMock,
  trackTikTokMock,
} = vi.hoisted(() => ({
  logEventMock: vi.fn(),
  setUserPropertiesMock: vi.fn(),
  trackMetaMock: vi.fn(),
  trackMetaCustomMock: vi.fn(),
  trackTikTokMock: vi.fn(),
}))

vi.mock('@/lib/firebase', () => ({
  analytics: { __analytics: true },
}))

vi.mock('firebase/analytics', () => ({
  logEvent: (...args: unknown[]) => logEventMock(...args),
  setUserProperties: (...args: unknown[]) => setUserPropertiesMock(...args),
}))

vi.mock('@/lib/metaPixel', () => ({
  trackMeta: (...args: unknown[]) => trackMetaMock(...args),
  trackMetaCustom: (...args: unknown[]) => trackMetaCustomMock(...args),
}))

vi.mock('@/lib/tiktokPixel', () => ({
  trackTikTok: (...args: unknown[]) => trackTikTokMock(...args),
}))

import { AnalyticsLogger, normalizeDistrict, priceBandFor } from '../analytics'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AnalyticsLogger', () => {
  beforeEach(() => {
    logEventMock.mockReset()
    setUserPropertiesMock.mockReset()
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

  // Matches the app: share_listing for links, share_listing_branded for image
  // cards. share_method is website-only — the app has one way to share.
  describe('shareListing', () => {
    it('logs share_listing with listing_id, operation_type and share_method', () => {
      AnalyticsLogger.shareListing('listing-abc', 'venta', 'native')
      expect(logEventMock).toHaveBeenCalledTimes(1)
      expect(logEventMock).toHaveBeenCalledWith(
        expect.anything(),
        'share_listing',
        { listing_id: 'listing-abc', operation_type: 'venta', share_method: 'native' },
      )
    })

    it('does not call Meta or TikTok', () => {
      AnalyticsLogger.shareListing('listing-abc', 'alquiler', 'clipboard')
      expect(trackMetaMock).not.toHaveBeenCalled()
      expect(trackMetaCustomMock).not.toHaveBeenCalled()
      expect(trackTikTokMock).not.toHaveBeenCalled()
    })
  })

  describe('shareListingBranded', () => {
    it('logs share_listing_branded with card_format and share_method', () => {
      AnalyticsLogger.shareListingBranded('listing-abc', 'venta', 'story', 'download')
      expect(logEventMock).toHaveBeenCalledTimes(1)
      expect(logEventMock).toHaveBeenCalledWith(
        expect.anything(),
        'share_listing_branded',
        {
          listing_id: 'listing-abc',
          operation_type: 'venta',
          card_format: 'story',
          share_method: 'download',
        },
      )
    })

    it('does not call Meta or TikTok', () => {
      AnalyticsLogger.shareListingBranded('listing-abc', 'venta', 'square', 'native')
      expect(trackMetaMock).not.toHaveBeenCalled()
      expect(trackMetaCustomMock).not.toHaveBeenCalled()
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

// ── Metrics plan A0: events shared with the Flutter app ──────────────────────
// Names and fixed values are a cross-repo contract with
// oqupa/lib/utils/analytics_logger.dart. Changing one here splits one moment
// into two numbers in GA.

/** The params of the single logEvent call made by the action under test. */
function loggedParams(): Record<string, unknown> | undefined {
  expect(logEventMock).toHaveBeenCalledTimes(1)
  return logEventMock.mock.calls[0]![2] as Record<string, unknown> | undefined
}

function expectNoAdPlatformCalls() {
  expect(trackMetaMock).not.toHaveBeenCalled()
  expect(trackMetaCustomMock).not.toHaveBeenCalled()
  expect(trackTikTokMock).not.toHaveBeenCalled()
}

describe('priceBandFor', () => {
  it.each([
    [0, '0-500'],
    [499.99, '0-500'],
    [500, '500-1000'],
    [1000, '1000-1500'],
    [1499, '1000-1500'],
    [1500, '1500-2000'],
    [2000, '2000-3000'],
    [3000, '3000-5000'],
    [5000, '5000-10000'],
    [10000, '10000-20000'],
    [20000, '20000-50000'],
    [50000, '50000-100000'],
    [100000, '100000-200000'],
    [200000, '200000-500000'],
    [499999, '200000-500000'],
    [500000, '500000+'],
    [12_000_000, '500000+'],
  ])('%d → %s', (price, band) => {
    expect(priceBandFor(price)).toBe(band)
  })

  it.each([-1, NaN, Infinity, -Infinity])('returns undefined for %d', (price) => {
    expect(priceBandFor(price)).toBeUndefined()
  })
})

describe('normalizeDistrict', () => {
  it.each([
    ['sullana', 'Sullana'],
    ['SULLANA', 'Sullana'],
    ['  san   isidro ', 'San Isidro'],
    ['san\tjuan de\nlurigancho', 'San Juan De Lurigancho'],
    ['jesús maría', 'Jesús María'],
    ['ÑAÑA', 'Ñaña'],
    ['villa el salvador-2', 'Villa El Salvador-2'],
    ["o'higgins", "O'Higgins"],
  ])('%j → %j', (raw, expected) => {
    expect(normalizeDistrict(raw)).toBe(expected)
  })

  it.each([undefined, null, '', '   '])('returns undefined for %j', (raw) => {
    expect(normalizeDistrict(raw)).toBeUndefined()
  })
})

describe('AnalyticsLogger — A0 additions', () => {
  beforeEach(() => {
    logEventMock.mockReset()
    setUserPropertiesMock.mockReset()
    trackMetaMock.mockReset()
    trackMetaCustomMock.mockReset()
    trackTikTokMock.mockReset()
  })

  describe('listingViewed extras', () => {
    it('adds the Firebase-only extras, normalised', () => {
      AnalyticsLogger.listingViewed('listing-abc', 'Miraflores', {
        operationType: 'alquiler',
        district: '  san   isidro ',
        propertyType: 'departamento',
        priceBand: '1000-1500',
        priceCurrency: 'PEN',
      })
      expect(logEventMock).toHaveBeenCalledWith(expect.anything(), 'listing_viewed', {
        listing_id: 'listing-abc',
        operation_type: 'alquiler',
        district: 'San Isidro',
        property_type: 'departamento',
        price_band: '1000-1500',
        price_currency: 'PEN',
      })
    })

    it('leaves the Meta and TikTok payloads exactly as before', () => {
      AnalyticsLogger.listingViewed('listing-abc', 'Miraflores', {
        operationType: 'venta',
        district: 'Surco',
        propertyType: 'casa',
        priceBand: '500000+',
        priceCurrency: 'USD',
      })
      expect(trackMetaMock).toHaveBeenCalledTimes(1)
      expect(trackMetaMock).toHaveBeenCalledWith('ViewContent', {
        content_type: 'property',
        content_ids: ['listing-abc'],
        content_category: 'Miraflores',
      })
      expect(trackTikTokMock).toHaveBeenCalledTimes(1)
      expect(trackTikTokMock).toHaveBeenCalledWith('ViewContent', {
        content_type: 'product',
        content_id: 'listing-abc',
        content_category: 'Miraflores',
      })
      expect(trackMetaCustomMock).not.toHaveBeenCalled()
    })

    it('does not send the positional (Meta) district to Firebase', () => {
      AnalyticsLogger.listingViewed('listing-abc', 'Miraflores')
      expect(loggedParams()).toEqual({ listing_id: 'listing-abc' })
    })

    it('omits a blank district', () => {
      AnalyticsLogger.listingViewed('listing-abc', undefined, { district: '   ' })
      expect(loggedParams()).toEqual({ listing_id: 'listing-abc' })
    })

    it('drops a property_type that is not a stored value', () => {
      AnalyticsLogger.listingViewed('listing-abc', undefined, {
        propertyType: 'Departamento' as never,
      })
      expect(loggedParams()).toEqual({ listing_id: 'listing-abc' })
    })
  })

  describe('price_band / price_currency pairing', () => {
    it('drops a band that priceBandFor cannot produce', () => {
      AnalyticsLogger.contactRevealed('listing-xyz', {
        priceBand: '1234',
        priceCurrency: 'PEN',
      })
      expect(loggedParams()).toEqual({ listing_id: 'listing-xyz' })
    })

    it('drops the band without a currency', () => {
      AnalyticsLogger.contactRevealed('listing-xyz', { priceBand: '1000-1500' })
      expect(loggedParams()).toEqual({ listing_id: 'listing-xyz' })
    })

    it('drops the currency without a band', () => {
      AnalyticsLogger.contactRevealed('listing-xyz', { priceCurrency: 'USD' })
      expect(loggedParams()).toEqual({ listing_id: 'listing-xyz' })
    })

    it('drops a currency other than PEN or USD', () => {
      AnalyticsLogger.contactRevealed('listing-xyz', {
        priceBand: '1000-1500',
        priceCurrency: 'EUR' as never,
      })
      expect(loggedParams()).toEqual({ listing_id: 'listing-xyz' })
    })

    it('accepts every band priceBandFor produces', () => {
      const prices = [0, 500, 1000, 1500, 2000, 3000, 5000, 10000, 20000, 50000, 100000, 200000, 500000]
      for (const price of prices) {
        logEventMock.mockReset()
        const band = priceBandFor(price)!
        AnalyticsLogger.contactRevealed('l', { priceBand: band, priceCurrency: 'USD' })
        expect(loggedParams()).toMatchObject({ price_band: band, price_currency: 'USD' })
      }
    })
  })

  describe('contactRevealed extras', () => {
    it('adds district, property_type and price pair but never operation_type', () => {
      AnalyticsLogger.contactRevealed('listing-xyz', {
        district: 'MIRAFLORES',
        propertyType: 'habitacion',
        priceBand: '500-1000',
        priceCurrency: 'PEN',
        // Not part of the contact_revealed contract, even if a caller sneaks it in.
        ...({ operationType: 'alquiler' } as object),
      })
      expect(loggedParams()).toEqual({
        listing_id: 'listing-xyz',
        district: 'Miraflores',
        property_type: 'habitacion',
        price_band: '500-1000',
        price_currency: 'PEN',
      })
    })

    it('leaves the Meta and TikTok payloads exactly as before', () => {
      AnalyticsLogger.contactRevealed('listing-xyz', {
        district: 'Miraflores',
        propertyType: 'casa',
        priceBand: '0-500',
        priceCurrency: 'PEN',
      })
      expect(trackMetaMock).toHaveBeenCalledTimes(1)
      expect(trackMetaMock).toHaveBeenCalledWith('Contact', {
        content_type: 'property',
        content_ids: ['listing-xyz'],
      })
      expect(trackTikTokMock).toHaveBeenCalledTimes(1)
      expect(trackTikTokMock).toHaveBeenCalledWith('Contact', {
        content_type: 'product',
        content_id: 'listing-xyz',
      })
    })
  })

  describe('registrationCompleted extras', () => {
    it('adds campaign and ref_listing_id to sign_up', () => {
      AnalyticsLogger.registrationCompleted({ campaign: 'piura_oct', refListingId: 'listing-1' })
      expect(logEventMock).toHaveBeenCalledWith(expect.anything(), 'sign_up', {
        campaign: 'piura_oct',
        ref_listing_id: 'listing-1',
      })
    })

    it('omits the ones not given', () => {
      AnalyticsLogger.registrationCompleted({ campaign: 'piura_oct' })
      expect(loggedParams()).toEqual({ campaign: 'piura_oct' })
    })

    it('keeps Meta and TikTok CompleteRegistration bare', () => {
      AnalyticsLogger.registrationCompleted({ campaign: 'piura_oct', refListingId: 'l' })
      expect(trackMetaMock).toHaveBeenCalledTimes(1)
      expect(trackMetaMock).toHaveBeenCalledWith('CompleteRegistration')
      expect(trackTikTokMock).toHaveBeenCalledTimes(1)
      expect(trackTikTokMock).toHaveBeenCalledWith('CompleteRegistration')
    })
  })

  describe('Firebase-only events', () => {
    // [description, action, event name, expected params]
    const cases: [string, () => void, string, Record<string, unknown> | undefined][] = [
      ['realtorApplicationStarted', () => AnalyticsLogger.realtorApplicationStarted(), 'realtor_application_started', undefined],
      ['realtorApplicationSubmitted', () => AnalyticsLogger.realtorApplicationSubmitted(), 'realtor_application_submitted', undefined],
      ['claimAttempted', () => AnalyticsLogger.claimAttempted('l1', 'limit_reached'), 'claim_attempted', { listing_id: 'l1', result: 'limit_reached' }],
      ['boostOfferViewed', () => AnalyticsLogger.boostOfferViewed('reminder'), 'boost_offer_viewed', { placement: 'reminder' }],
      ['boostTierSelected', () => AnalyticsLogger.boostTierSelected('premium'), 'boost_tier_selected', { tier: 'premium' }],
      ['boostCheckoutAbandoned', () => AnalyticsLogger.boostCheckoutAbandoned('premium', 'payment'), 'boost_checkout_abandoned', { tier: 'premium', step: 'payment' }],
      ['contactTapped', () => AnalyticsLogger.contactTapped('l1', 'unverified'), 'contact_tapped', { listing_id: 'l1', auth_state: 'unverified' }],
      ['contactGateStep', () => AnalyticsLogger.contactGateStep('phone_verify'), 'contact_gate_step', { step: 'phone_verify' }],
      ['contactRevealFailed', () => AnalyticsLogger.contactRevealFailed('l1', 'permission-denied'), 'contact_reveal_failed', { listing_id: 'l1', code: 'permission-denied' }],
      ['filterApplied', () => AnalyticsLogger.filterApplied({ filterType: 'price' }), 'filter_applied', { filter_type: 'price' }],
      ['searchNoResults', () => AnalyticsLogger.searchNoResults({ filterType: 'price' }), 'search_no_results', { filter_type: 'price' }],
    ]

    it.each(cases)('%s logs %s', (_desc, action, name, params) => {
      action()
      if (params === undefined) {
        expect(logEventMock).toHaveBeenCalledWith(expect.anything(), name)
        expect(logEventMock.mock.calls[0]).toHaveLength(2)
      } else {
        expect(logEventMock).toHaveBeenCalledWith(expect.anything(), name, params)
      }
      expect(logEventMock).toHaveBeenCalledTimes(1)
    })

    it.each(cases)('%s never reaches Meta or TikTok', (_desc, action) => {
      action()
      expectNoAdPlatformCalls()
    })

    it.each(['ok', 'limit_reached', 'full', 'duplicate', 'error'] as const)(
      'claim_attempted result %s is sent verbatim',
      (result) => {
        AnalyticsLogger.claimAttempted('l1', result)
        expect(loggedParams()).toEqual({ listing_id: 'l1', result })
      },
    )

    it.each(['create', 'edit', 'reminder', 'my_listings', 'listing_page'] as const)(
      'boost_offer_viewed placement %s is sent verbatim',
      (placement) => {
        AnalyticsLogger.boostOfferViewed(placement)
        expect(loggedParams()).toEqual({ placement })
      },
    )

    it.each(['guest', 'unverified', 'verified'] as const)(
      'contact_tapped auth_state %s is sent verbatim',
      (authState) => {
        AnalyticsLogger.contactTapped('l1', authState)
        expect(loggedParams()).toEqual({ listing_id: 'l1', auth_state: authState })
      },
    )

    it('cuts text values to 100 characters', () => {
      AnalyticsLogger.contactRevealFailed('l1', 'x'.repeat(150))
      expect(loggedParams()!.code as string).toHaveLength(100)
    })
  })

  describe('filter set (filter_applied / search_no_results)', () => {
    it('sends every field, property_types sorted and comma-joined', () => {
      AnalyticsLogger.filterApplied({
        filterType: 'sheet',
        operationType: 'alquiler',
        propertyTypes: ['terreno', 'casa', 'departamento'],
        rentalDuration: 'shortTerm',
        minPricePen: 500,
        maxPricePen: 2000,
        minPriceUsd: 100,
        maxPriceUsd: 900,
        priceInputCurrency: 'PEN',
        resultCount: 0,
      })
      expect(loggedParams()).toEqual({
        filter_type: 'sheet',
        operation_type: 'alquiler',
        property_types: 'casa,departamento,terreno',
        rental_duration: 'shortTerm',
        min_price_pen: 500,
        max_price_pen: 2000,
        price_currency: 'PEN',
        result_count: 0,
      })
    })

    it('search_no_results never carries result_count', () => {
      AnalyticsLogger.searchNoResults({
        filterType: 'sheet',
        propertyTypes: ['oficina'],
        ...({ resultCount: 0 } as object),
      })
      expect(loggedParams()).toEqual({ filter_type: 'sheet', property_types: 'oficina' })
    })

    it.each([
      [{ minPricePen: 0 }, 'PEN'],
      [{ maxPricePen: 3000 }, 'PEN'],
      [{ minPriceUsd: 50000 }, 'USD'],
      [{ maxPriceUsd: 90000 }, 'USD'],
      [{ maxPricePen: 3000, minPriceUsd: 1 }, undefined],
    ])('price_currency follows the ranges set: %j → %s', (prices, currency) => {
      AnalyticsLogger.searchNoResults({ filterType: 'price', ...prices })
      expect(loggedParams()!.price_currency).toBe(currency)
    })

    // Same rule as _filterSetParameters in the app's analytics_logger.dart:
    // only one range is ever sent, and price_currency is a single code.
    describe('single-currency rule', () => {
      const both = { minPricePen: 500, maxPricePen: 2000, minPriceUsd: 130, maxPriceUsd: 530 }

      it('both ranges set: sends the one in priceInputCurrency (PEN)', () => {
        AnalyticsLogger.searchNoResults({ filterType: 'price', ...both, priceInputCurrency: 'PEN' })
        expect(loggedParams()).toEqual({
          filter_type: 'price',
          min_price_pen: 500,
          max_price_pen: 2000,
          price_currency: 'PEN',
        })
      })

      it('both ranges set: sends the one in priceInputCurrency (USD)', () => {
        AnalyticsLogger.searchNoResults({ filterType: 'price', ...both, priceInputCurrency: 'USD' })
        expect(loggedParams()).toEqual({
          filter_type: 'price',
          min_price_usd: 130,
          max_price_usd: 530,
          price_currency: 'USD',
        })
      })

      it('both ranges set, input currency unknown: sends neither, keeps filter_type and result_count', () => {
        AnalyticsLogger.filterApplied({ filterType: 'price', ...both, resultCount: 4 })
        expect(loggedParams()).toEqual({ filter_type: 'price', result_count: 4 })
      })

      it('one range set in the currency typed: sends it', () => {
        AnalyticsLogger.searchNoResults({ filterType: 'price', maxPriceUsd: 900, priceInputCurrency: 'USD' })
        expect(loggedParams()).toEqual({ filter_type: 'price', max_price_usd: 900, price_currency: 'USD' })
      })

      it('one range set in the other currency: sends neither (it is the converted one)', () => {
        AnalyticsLogger.filterApplied({
          filterType: 'price',
          minPriceUsd: 2.910992898923922,
          priceInputCurrency: 'PEN',
          resultCount: 2,
        })
        expect(loggedParams()).toEqual({ filter_type: 'price', result_count: 2 })
      })

      it('priceInputCurrency alone, with no range, sends no price fields', () => {
        AnalyticsLogger.searchNoResults({ filterType: 'price', priceInputCurrency: 'USD' })
        expect(loggedParams()).toEqual({ filter_type: 'price' })
      })
    })

    it('omits price_currency when no range is set', () => {
      AnalyticsLogger.filterApplied({ filterType: 'operation', operationType: 'venta' })
      expect(loggedParams()).toEqual({ filter_type: 'operation', operation_type: 'venta' })
    })

    it('omits an empty property_types list', () => {
      AnalyticsLogger.filterApplied({ filterType: 'type', propertyTypes: [] })
      expect(loggedParams()).toEqual({ filter_type: 'type' })
    })

    it('drops property types that are not stored values', () => {
      AnalyticsLogger.filterApplied({
        filterType: 'type',
        propertyTypes: ['local', 'Casa' as never, 'hospedaje'],
      })
      expect(loggedParams()).toEqual({ filter_type: 'type', property_types: 'hospedaje,local' })
    })
  })

  describe('setUserProperties', () => {
    it('sets all three, is_realtor as a string', () => {
      AnalyticsLogger.setUserProperties({
        userSegment: 'seeker',
        homeDistrict: 'Piura',
        isRealtor: false,
      })
      expect(setUserPropertiesMock).toHaveBeenCalledWith(expect.anything(), {
        user_segment: 'seeker',
        home_district: 'Piura',
        is_realtor: 'false',
      })
    })

    it('sends "true" for a realtor', () => {
      AnalyticsLogger.setUserProperties({ isRealtor: true })
      expect(setUserPropertiesMock).toHaveBeenCalledWith(expect.anything(), { is_realtor: 'true' })
    })

    it('leaves out properties not given, so they are not changed', () => {
      AnalyticsLogger.setUserProperties({ userSegment: 'owner' })
      expect(setUserPropertiesMock).toHaveBeenCalledWith(expect.anything(), { user_segment: 'owner' })
    })

    it('normalises home_district like the event district', () => {
      AnalyticsLogger.setUserProperties({ homeDistrict: '  san   JUAN de lurigancho ' })
      expect(setUserPropertiesMock).toHaveBeenCalledWith(expect.anything(), {
        home_district: 'San Juan De Lurigancho',
      })
    })

    it('omits a blank home_district but still sends the others', () => {
      AnalyticsLogger.setUserProperties({ userSegment: 'owner', homeDistrict: '   ' })
      expect(setUserPropertiesMock).toHaveBeenCalledWith(expect.anything(), { user_segment: 'owner' })
    })

    it('makes no call when home_district is the only property and blank', () => {
      AnalyticsLogger.setUserProperties({ homeDistrict: '' })
      expect(setUserPropertiesMock).not.toHaveBeenCalled()
    })

    it('makes no call when nothing is given', () => {
      AnalyticsLogger.setUserProperties({})
      expect(setUserPropertiesMock).not.toHaveBeenCalled()
    })

    it('cuts values to 36 characters', () => {
      AnalyticsLogger.setUserProperties({ homeDistrict: 'y'.repeat(50) })
      const props = setUserPropertiesMock.mock.calls[0]![1] as Record<string, string>
      expect(props.home_district).toHaveLength(36)
    })

    it('never reaches Meta or TikTok, and logs no event', () => {
      AnalyticsLogger.setUserProperties({ userSegment: 'owner', isRealtor: true })
      expectNoAdPlatformCalls()
      expect(logEventMock).not.toHaveBeenCalled()
    })
  })
})

// ── Debug visibility (metrics plan A3) ───────────────────────────────────────
// oqupa-staging has no GA property, so in dev the console line is the only
// proof an event left. Same format as the app's `Analytics: <name> <params>`.

describe('AnalyticsLogger — dev console line', () => {
  let debugSpy: MockInstance<typeof console.debug>

  beforeEach(() => {
    logEventMock.mockReset()
    setUserPropertiesMock.mockReset()
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    debugSpy.mockRestore()
    vi.unstubAllEnvs()
  })

  it('prints one line per Firebase event, with the params actually sent', () => {
    AnalyticsLogger.contactRevealed('L1', { district: ' castilla ', priceBand: '1000-1500', priceCurrency: 'PEN' })
    expect(debugSpy).toHaveBeenCalledTimes(1)
    expect(debugSpy).toHaveBeenCalledWith(
      'Analytics: contact_revealed {"listing_id":"L1","district":"Castilla","price_band":"1000-1500","price_currency":"PEN"}',
    )
  })

  it('prints events that bypass the cleaner too (page_view, share_listing, login)', () => {
    AnalyticsLogger.pageView('Home')
    AnalyticsLogger.shareListing('L1', 'venta', 'native')
    AnalyticsLogger.loginCompleted('email')
    expect(debugSpy.mock.calls.map((c) => c[0])).toEqual([
      'Analytics: page_view {"page_title":"Home"}',
      'Analytics: share_listing {"listing_id":"L1","operation_type":"venta","share_method":"native"}',
      'Analytics: login {"method":"email"}',
    ])
  })

  it('prints {} for an event with no params', () => {
    AnalyticsLogger.realtorApplicationSubmitted()
    expect(debugSpy).toHaveBeenCalledWith('Analytics: realtor_application_submitted {}')
  })

  it('prints one line per user property sent', () => {
    AnalyticsLogger.setUserProperties({ userSegment: 'buyer', isRealtor: false })
    expect(debugSpy.mock.calls.map((c) => c[0])).toEqual([
      'Analytics: user_segment buyer',
      'Analytics: is_realtor false',
    ])
  })

  it('prints nothing when no user property is sent', () => {
    AnalyticsLogger.setUserProperties({})
    expect(debugSpy).not.toHaveBeenCalled()
  })

  it('prints nothing outside dev, but still sends', () => {
    vi.stubEnv('DEV', false)
    AnalyticsLogger.pageView('Home')
    AnalyticsLogger.realtorApplicationSubmitted()
    AnalyticsLogger.setUserProperties({ userSegment: 'buyer' })
    expect(debugSpy).not.toHaveBeenCalled()
    expect(logEventMock).toHaveBeenCalledTimes(2)
    expect(setUserPropertiesMock).toHaveBeenCalledTimes(1)
  })
})

// A12c: a label must be removable — on sign-out, and when a person no longer
// has one — or it stays for the rest of the visit, under whoever comes next.
describe('AnalyticsLogger.clearUserProperties', () => {
  beforeEach(() => setUserPropertiesMock.mockReset())

  it('removes all three by sending null to Firebase, in one call', () => {
    AnalyticsLogger.clearUserProperties()
    expect(setUserPropertiesMock).toHaveBeenCalledExactlyOnceWith(
      { __analytics: true },
      { user_segment: null, home_district: null, is_realtor: null },
    )
  })
})
