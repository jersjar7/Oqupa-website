import { describe, it, expect } from 'vitest'
import { buildBrandedCardConfig } from '../brandedCardConfig'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function mkListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'listing-1',
    propertyId: 'prop-1',
    ownerId: 'owner-1',
    role: 'owner',
    description: 'A nice property',
    operationType: 'venta',
    price: { amount: 180000, currency: 'USD' },
    status: 'active',
    viewCount: 0,
    contactClickCount: 0,
    wantsRealtorHelp: false,
    maxRealtors: 0,
    currentClaimsCount: 0,
    isBoosted: false,
    boostScore: 1,
    showExactLocation: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    media: { propertyPhotoUrls: [] },
    ...overrides,
  } as Listing
}

function mkProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: 'prop-1',
    listedByUserId: 'owner-1',
    propertyType: 'departamento',
    operationType: 'venta',
    specs: { bedroomCount: 3, bathroomCount: 2, totalAreaInSquareMeters: 120 },
    location: {
      latitude: -5.2, longitude: -80.6,
      calle: 'Calle Lima 123',
      urbanizacion: 'San Eduardo',
      distrito: 'Piura',
      provincia: 'Piura',
      departamento: 'Piura',
      countryIsoCode: 'PE',
    },
    currentPrice: { amount: 180000, currency: 'USD' },
    normalizedAddress: 'San Eduardo, Piura',
    media: { propertyPhotoUrls: [] },
    updatedAt: new Date(),
    isAvailable: true,
    ...overrides,
  } as Property
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildBrandedCardConfig', () => {
  describe('operationLabel', () => {
    it('is "SE VENDE" for venta', () => {
      const config = buildBrandedCardConfig(mkListing(), mkProperty(), 'story')
      expect(config.operationLabel).toBe('SE VENDE')
    })

    it('is "SE ALQUILA" for alquiler', () => {
      const config = buildBrandedCardConfig(
        mkListing({ operationType: 'alquiler' }),
        mkProperty({ operationType: 'alquiler' }),
        'story',
      )
      expect(config.operationLabel).toBe('SE ALQUILA')
    })
  })

  describe('propertyType', () => {
    it('uses the short label for departamento → "Apto."', () => {
      const config = buildBrandedCardConfig(mkListing(), mkProperty({ propertyType: 'departamento' }), 'story')
      expect(config.propertyType).toBe('Apto.')
    })

    it('uses the short label for casa → "Casa"', () => {
      const config = buildBrandedCardConfig(mkListing(), mkProperty({ propertyType: 'casa' }), 'story')
      expect(config.propertyType).toBe('Casa')
    })

    it('uses the short label for terreno', () => {
      const config = buildBrandedCardConfig(mkListing(), mkProperty({ propertyType: 'terreno' }), 'story')
      expect(config.propertyType).toBe('Terreno')
    })

    it('uses the short label for local', () => {
      const config = buildBrandedCardConfig(mkListing(), mkProperty({ propertyType: 'local' }), 'story')
      expect(config.propertyType).toBe('Local')
    })
  })

  describe('priceText', () => {
    it('uses US$ symbol for USD currency', () => {
      const config = buildBrandedCardConfig(
        mkListing({ price: { amount: 180000, currency: 'USD' } }),
        mkProperty({ operationType: 'venta' }),
        'story',
      )
      expect(config.priceText).toContain('US$')
      expect(config.priceText).toContain('180')
    })

    it('uses S/. symbol for PEN currency', () => {
      const config = buildBrandedCardConfig(
        mkListing({ price: { amount: 1500, currency: 'PEN' } }),
        mkProperty({ operationType: 'venta' }),
        'story',
      )
      expect(config.priceText).toContain('S/.')
    })

    it('appends /mes for long-term rental', () => {
      const config = buildBrandedCardConfig(
        mkListing({ price: { amount: 1700, currency: 'PEN' } }),
        mkProperty({ operationType: 'alquiler', rentalDurationType: 'longTerm' }),
        'story',
      )
      expect(config.priceText).toContain('/mes')
    })

    it('appends /noche for short-term rental', () => {
      const config = buildBrandedCardConfig(
        mkListing({ price: { amount: 200, currency: 'PEN' } }),
        mkProperty({ operationType: 'alquiler', rentalDurationType: 'shortTerm' }),
        'story',
      )
      expect(config.priceText).toContain('/noche')
    })

    it('defaults to /mes when rentalDurationType is absent', () => {
      const config = buildBrandedCardConfig(
        mkListing({ price: { amount: 1200, currency: 'PEN' } }),
        mkProperty({ operationType: 'alquiler', rentalDurationType: undefined }),
        'story',
      )
      expect(config.priceText).toContain('/mes')
    })

    it('has no suffix for venta', () => {
      const config = buildBrandedCardConfig(
        mkListing({ price: { amount: 100000, currency: 'PEN' } }),
        mkProperty({ operationType: 'venta' }),
        'story',
      )
      expect(config.priceText).not.toContain('/mes')
      expect(config.priceText).not.toContain('/noche')
    })
  })

  describe('specsText', () => {
    it('includes bedrooms, bathrooms, and area', () => {
      const config = buildBrandedCardConfig(
        mkListing(),
        mkProperty({ specs: { bedroomCount: 3, bathroomCount: 2, totalAreaInSquareMeters: 120 } }),
        'story',
      )
      expect(config.specsText).toBe('3 hab. | 2 baños | 120 m²')
    })

    it('uses "baño" (singular) for 1 bathroom', () => {
      const config = buildBrandedCardConfig(
        mkListing(),
        mkProperty({ specs: { bedroomCount: 1, bathroomCount: 1, totalAreaInSquareMeters: 60 } }),
        'story',
      )
      expect(config.specsText).toContain('1 baño')
      expect(config.specsText).not.toContain('baños')
    })

    it('omits bedrooms when bedroomCount is null', () => {
      const config = buildBrandedCardConfig(
        mkListing(),
        mkProperty({ specs: { bedroomCount: null, bathroomCount: 1, totalAreaInSquareMeters: 80 } as Property['specs'] }),
        'story',
      )
      expect(config.specsText).not.toContain('hab.')
      expect(config.specsText).toContain('m²')
    })

    it('omits bathrooms when bathroomCount is null', () => {
      const config = buildBrandedCardConfig(
        mkListing(),
        mkProperty({ specs: { bedroomCount: null, bathroomCount: null, totalAreaInSquareMeters: 500 } as Property['specs'] }),
        'story',
      )
      expect(config.specsText).toBe('500 m²')
    })

    it('floors decimal area', () => {
      const config = buildBrandedCardConfig(
        mkListing(),
        mkProperty({ specs: { bedroomCount: null, bathroomCount: null, totalAreaInSquareMeters: 99.9 } as Property['specs'] }),
        'story',
      )
      expect(config.specsText).toContain('99 m²')
    })
  })

  describe('locationText', () => {
    it('includes urbanizacion and distrito when both present', () => {
      const config = buildBrandedCardConfig(
        mkListing(),
        mkProperty({ location: { ...mkProperty().location, urbanizacion: 'San Eduardo', distrito: 'Piura' } }),
        'story',
      )
      expect(config.locationText).toBe('San Eduardo, Piura')
    })

    it('falls back to just distrito when urbanizacion is absent', () => {
      const config = buildBrandedCardConfig(
        mkListing(),
        mkProperty({ location: { ...mkProperty().location, urbanizacion: '', distrito: 'Castilla' } }),
        'story',
      )
      expect(config.locationText).toBe('Castilla')
    })
  })

  describe('listingUrl', () => {
    it('builds the correct listing URL', () => {
      const config = buildBrandedCardConfig(
        mkListing({ id: 'listing-abc123' }),
        mkProperty(),
        'story',
      )
      expect(config.listingUrl).toBe('https://oqupa.com/property/listing-abc123')
    })
  })

  describe('format', () => {
    it('passes the format through unchanged', () => {
      expect(buildBrandedCardConfig(mkListing(), mkProperty(), 'story').format).toBe('story')
      expect(buildBrandedCardConfig(mkListing(), mkProperty(), 'square').format).toBe('square')
    })
  })

  describe('label and currency fallbacks', () => {
    it('falls back to raw propertyType when not in PROPERTY_TYPE_SHORT_LABELS', () => {
      // Exercises the `?? property.propertyType` branch (line 37)
      const config = buildBrandedCardConfig(
        mkListing(),
        mkProperty({ propertyType: 'penthouse' as Property['propertyType'] }),
        'story',
      )
      expect(config.propertyType).toBe('penthouse')
    })

    it('falls back to S/. when currency is not in CURRENCY_SYMBOLS', () => {
      // Exercises the `?? 'S/.'` branch (line 40)
      const config = buildBrandedCardConfig(
        mkListing({ price: { amount: 500, currency: 'EUR' as Listing['price']['currency'] } }),
        mkProperty({ operationType: 'venta' }),
        'story',
      )
      expect(config.priceText).toContain('S/.')
    })

    it('falls back to /mes when rentalDurationType suffix is missing from RENTAL_DURATION_PRICE_SUFFIX', () => {
      // Exercises the `?? '/mes'` branch (line 44)
      const config = buildBrandedCardConfig(
        mkListing({ price: { amount: 1200, currency: 'PEN' } }),
        mkProperty({ operationType: 'alquiler', rentalDurationType: 'unknown' as Property['rentalDurationType'] }),
        'story',
      )
      expect(config.priceText).toContain('/mes')
    })
  })
})
