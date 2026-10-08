// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateShareText, shareListing, type ShareListingParams } from '../shareUtils'

// ---------------------------------------------------------------------------
// Minimal fixtures
// ---------------------------------------------------------------------------

const baseParams: ShareListingParams = {
  listingId: 'listing-abc-123',
  propertyType: 'casa',
  operationType: 'venta',
  priceAmount: 250_000,
  priceCurrency: 'USD',
  distrito: 'Miraflores',
}

// ---------------------------------------------------------------------------
// generateShareText — pure function, no browser API
// ---------------------------------------------------------------------------
describe('generateShareText', () => {
  it('includes the operation type label', () => {
    const text = generateShareText(baseParams)
    expect(text).toContain('Venta')
  })

  it('includes the property type label', () => {
    const text = generateShareText(baseParams)
    expect(text).toContain('Casa')
  })

  it('includes the distrito', () => {
    const text = generateShareText(baseParams)
    expect(text).toContain('Miraflores')
  })

  it('includes the listing URL', () => {
    const text = generateShareText(baseParams)
    expect(text).toContain('https://oqupa.com/property/listing-abc-123')
  })

  it('includes "Ver en Oqupa:" CTA line', () => {
    const text = generateShareText(baseParams)
    expect(text).toContain('Ver en Oqupa:')
  })

  it('formats venta price without a suffix', () => {
    const text = generateShareText(baseParams)
    // Should contain the price but no "/mes" or "/noche"
    expect(text).toContain('250')
    expect(text).not.toContain('/mes')
    expect(text).not.toContain('/noche')
  })

  it('formats alquiler longTerm price with /mes suffix', () => {
    const text = generateShareText({
      ...baseParams,
      operationType: 'alquiler',
      rentalDurationType: 'longTerm',
    })
    expect(text).toContain('/mes')
  })

  it('formats alquiler shortTerm price with /noche suffix', () => {
    const text = generateShareText({
      ...baseParams,
      operationType: 'alquiler',
      rentalDurationType: 'shortTerm',
    })
    expect(text).toContain('/noche')
  })

  it('defaults to /mes when rentalDurationType is missing on alquiler', () => {
    const text = generateShareText({
      ...baseParams,
      operationType: 'alquiler',
      // rentalDurationType omitted
    })
    expect(text).toContain('/mes')
  })

  it('includes bedroomCount when provided', () => {
    const text = generateShareText({ ...baseParams, bedroomCount: 3 })
    expect(text).toContain('3 hab.')
  })

  it('does not include bedroom line when bedroomCount is null', () => {
    const text = generateShareText({ ...baseParams, bedroomCount: null })
    expect(text).not.toContain('hab.')
  })

  it('uses singular "baño" for exactly one bathroom', () => {
    const text = generateShareText({ ...baseParams, bathroomCount: 1 })
    expect(text).toMatch(/1 baño[^s]/)
  })

  it('uses plural "baños" for more than one bathroom', () => {
    const text = generateShareText({ ...baseParams, bathroomCount: 2 })
    expect(text).toContain('2 baños')
  })

  it('does not include bathroom line when bathroomCount is null', () => {
    const text = generateShareText({ ...baseParams, bathroomCount: null })
    expect(text).not.toContain('baño')
  })

  it('includes area with m² suffix and floors the value', () => {
    const text = generateShareText({ ...baseParams, totalAreaInSquareMeters: 85.9 })
    expect(text).toContain('85 m²')
    expect(text).not.toContain('85.9')
  })

  it('does not include area line when totalAreaInSquareMeters is null', () => {
    const text = generateShareText({ ...baseParams, totalAreaInSquareMeters: null })
    expect(text).not.toContain('m²')
  })

  it('includes urbanizacion + distrito on the location line when urbanizacion is provided', () => {
    const text = generateShareText({ ...baseParams, urbanizacion: 'San Isidro' })
    expect(text).toContain('San Isidro, Miraflores')
  })

  it('falls back to just the distrito when urbanizacion is absent', () => {
    const text = generateShareText(baseParams)
    // Ensure it does not double-mention with a comma, and distrito is present
    expect(text).not.toMatch(/,\s*Miraflores/)
    expect(text).toContain('Miraflores')
  })

  it('uses the PEN currency symbol', () => {
    const text = generateShareText({ ...baseParams, priceCurrency: 'PEN' })
    expect(text).toContain('S/.')
  })

  it('uses the USD currency symbol', () => {
    const text = generateShareText({ ...baseParams, priceCurrency: 'USD' })
    expect(text).toContain('US$')
  })

  it('includes all spec lines when all specs are provided', () => {
    const text = generateShareText({
      ...baseParams,
      bedroomCount: 4,
      bathroomCount: 3,
      totalAreaInSquareMeters: 200,
    })
    expect(text).toContain('4 hab.')
    expect(text).toContain('3 baños')
    expect(text).toContain('200 m²')
  })

  it('omits the entire specs line when no specs are provided', () => {
    const text = generateShareText({
      ...baseParams,
      bedroomCount: null,
      bathroomCount: null,
      totalAreaInSquareMeters: null,
    })
    expect(text).not.toContain('hab.')
    expect(text).not.toContain('baño')
    expect(text).not.toContain('m²')
  })
})

// ---------------------------------------------------------------------------
// shareListing — uses navigator.share / navigator.clipboard
// ---------------------------------------------------------------------------
describe('shareListing', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns "shared" when navigator.share resolves successfully', async () => {
    vi.stubGlobal('navigator', {
      share: vi.fn().mockResolvedValue(undefined),
      clipboard: { writeText: vi.fn() },
    })
    const result = await shareListing(baseParams)
    expect(result).toBe('shared')
  })

  it('returns "failed" when navigator.share rejects with AbortError', async () => {
    const abort = new Error('User cancelled')
    abort.name = 'AbortError'
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(abort),
      clipboard: { writeText: vi.fn() },
    })
    const result = await shareListing(baseParams)
    expect(result).toBe('failed')
  })

  it('falls back to clipboard when navigator.share is not available', async () => {
    vi.stubGlobal('navigator', {
      // No `share` property
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
    const result = await shareListing(baseParams)
    expect(result).toBe('copied')
  })

  it('returns "copied" when clipboard.writeText resolves', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
    const result = await shareListing(baseParams)
    expect(result).toBe('copied')
  })

  it('returns "failed" when clipboard.writeText rejects', async () => {
    vi.stubGlobal('navigator', {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Clipboard denied')) },
    })
    const result = await shareListing(baseParams)
    expect(result).toBe('failed')
  })

  it('passes the generated text to navigator.share', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      share: shareMock,
      clipboard: { writeText: vi.fn() },
    })
    await shareListing(baseParams)
    const callArgs = shareMock.mock.calls[0]?.[0]
    expect(callArgs).toBeDefined()
    expect(callArgs.text).toContain('listing-abc-123')
  })

  it('passes the generated text to clipboard when falling back', async () => {
    const clipboardMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      clipboard: { writeText: clipboardMock },
    })
    await shareListing(baseParams)
    expect(clipboardMock).toHaveBeenCalledOnce()
    const calledWith = clipboardMock.mock.calls[0]?.[0]
    expect(calledWith).toContain('listing-abc-123')
  })

  it('falls through to clipboard on non-AbortError from navigator.share', async () => {
    const networkErr = new Error('Network failure')
    const clipboardMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(networkErr),
      clipboard: { writeText: clipboardMock },
    })
    const result = await shareListing(baseParams)
    // Non-AbortError falls through to clipboard
    expect(result).toBe('copied')
    expect(clipboardMock).toHaveBeenCalledOnce()
  })

  it('uses the raw propertyType as fallback when not in PROPERTY_TYPE_LABELS', async () => {
    // This exercises the `?? params.propertyType` fallback in shareListing (line 80)
    const clipboardMock = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {
      clipboard: { writeText: clipboardMock },
    })
    const paramsWithUnknownType: ShareListingParams = {
      ...baseParams,
      propertyType: 'penthouse' as ShareListingParams['propertyType'],
    }
    await shareListing(paramsWithUnknownType)
    const calledWith = clipboardMock.mock.calls[0]?.[0] as string
    // The unknown type 'penthouse' should appear verbatim in the shared text
    expect(calledWith).toContain('penthouse')
  })
})

// ── generateShareText — branch fallbacks ──────────────────────────────────────
describe('generateShareText — label fallbacks', () => {
  it('uses raw propertyType when not in PROPERTY_TYPE_LABELS', () => {
    // Exercises the `?? params.propertyType` branch at lines 25-28
    const params: ShareListingParams = {
      ...baseParams,
      propertyType: 'penthouse' as ShareListingParams['propertyType'],
    }
    const text = generateShareText(params)
    expect(text).toContain('penthouse')
  })

  it('uses raw operationType when not in OPERATION_TYPE_LABELS', () => {
    // Exercises the `?? params.operationType` branch
    const params: ShareListingParams = {
      ...baseParams,
      operationType: 'permuta' as ShareListingParams['operationType'],
    }
    const text = generateShareText(params)
    expect(text).toContain('permuta')
  })

  it('uses raw currency symbol when not in CURRENCY_SYMBOLS', () => {
    // Exercises the `?? 'S/.'` currency fallback
    const params: ShareListingParams = {
      ...baseParams,
      priceCurrency: 'EUR' as ShareListingParams['priceCurrency'],
    }
    const text = generateShareText(params)
    // Fallback is 'S/.'
    expect(text).toContain('S/.')
  })

  it('defaults rentalDurationType to longTerm when undefined', () => {
    // Exercises the `|| 'longTerm'` fallback at line 39
    const params: ShareListingParams = {
      ...baseParams,
      operationType: 'alquiler',
      rentalDurationType: undefined, // no rentalDurationType provided
    }
    const text = generateShareText(params)
    expect(text).toContain('/mes') // longTerm suffix
  })

  it('falls back to "/mes" when rentalDurationType is an unknown key not in RENTAL_DURATION_PRICE_SUFFIX', () => {
    // Exercises the `?? '/mes'` fallback at line 39
    const params: ShareListingParams = {
      ...baseParams,
      operationType: 'alquiler',
      rentalDurationType: 'custom' as unknown as ShareListingParams['rentalDurationType'],
    }
    const text = generateShareText(params)
    expect(text).toContain('/mes')
  })
})
