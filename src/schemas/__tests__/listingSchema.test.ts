import { describe, it, expect } from 'vitest'
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  fullListingSchema,
} from '../listingSchema'

// ---------------------------------------------------------------------------
// Helpers — minimal valid objects for each step
// ---------------------------------------------------------------------------

const validStep1 = {
  propertyType: 'casa' as const,
  operationType: 'venta' as const,
  role: 'owner' as const,
}

const validStep1Alquiler = {
  propertyType: 'departamento' as const,
  operationType: 'alquiler' as const,
  rentalDurationType: 'longTerm' as const,
  role: 'owner' as const,
}

const validStep2Base = {
  propertyType: 'terreno',       // no rooms required
  description: 'A'.repeat(20),  // exactly 20 chars — minimum
  totalAreaInSquareMeters: 100,
  bedroomCount: null,
  bathroomCount: null,
  availableParkingSpaces: 0,
  propertyAmenities: [],
}

const validStep3 = {
  latitude: -12.046374,
  longitude: -77.042793,
  calle: 'Av. Larco 123',
  urbanizacion: 'Miraflores',
  distrito: 'Miraflores',
  provincia: 'Lima',
  departamento: 'Lima',
}

const validStep4 = {
  operationType: 'venta',
  amount: 100_000,
  currency: 'USD' as const,
  wantsRealtorHelp: false,
  maxRealtors: 1,
}

// ---------------------------------------------------------------------------
// step1Schema
// ---------------------------------------------------------------------------
describe('step1Schema', () => {
  it('accepts a valid venta listing', () => {
    expect(() => step1Schema.parse(validStep1)).not.toThrow()
  })

  it('accepts all valid propertyType values', () => {
    const types = ['casa', 'departamento', 'terreno', 'oficina', 'local', 'hospedaje', 'habitacion'] as const
    for (const t of types) {
      expect(() => step1Schema.parse({ ...validStep1, propertyType: t })).not.toThrow()
    }
  })

  it('rejects an invalid propertyType', () => {
    const result = step1Schema.safeParse({ ...validStep1, propertyType: 'galpón' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid operationType', () => {
    const result = step1Schema.safeParse({ ...validStep1, operationType: 'canje' })
    expect(result.success).toBe(false)
  })

  it('accepts both valid operationType values', () => {
    expect(() => step1Schema.parse({ ...validStep1, operationType: 'venta' })).not.toThrow()
    expect(() => step1Schema.parse({ ...validStep1Alquiler })).not.toThrow()
  })

  it('accepts all valid role values', () => {
    for (const role of ['owner', 'realtor', 'relative'] as const) {
      expect(() => step1Schema.parse({ ...validStep1, role })).not.toThrow()
    }
  })

  it('rejects an invalid role', () => {
    const result = step1Schema.safeParse({ ...validStep1, role: 'investor' })
    expect(result.success).toBe(false)
  })

  it('requires rentalDurationType when operationType is alquiler', () => {
    const result = step1Schema.safeParse({
      propertyType: 'departamento',
      operationType: 'alquiler',
      role: 'owner',
      // rentalDurationType intentionally omitted
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('rentalDurationType')
    }
  })

  it('does not require rentalDurationType for venta', () => {
    expect(() => step1Schema.parse(validStep1)).not.toThrow()
  })

  it('accepts longTerm and shortTerm rentalDurationType', () => {
    expect(() => step1Schema.parse({ ...validStep1Alquiler, rentalDurationType: 'longTerm' })).not.toThrow()
    expect(() => step1Schema.parse({ ...validStep1Alquiler, rentalDurationType: 'shortTerm' })).not.toThrow()
  })

  it('rejects an invalid rentalDurationType', () => {
    const result = step1Schema.safeParse({
      ...validStep1Alquiler,
      rentalDurationType: 'weekly',
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// step2Schema
// ---------------------------------------------------------------------------
describe('step2Schema', () => {
  it('accepts a valid step 2 payload for a property type without rooms', () => {
    expect(() => step2Schema.parse(validStep2Base)).not.toThrow()
  })

  it('rejects description shorter than 20 chars', () => {
    const result = step2Schema.safeParse({ ...validStep2Base, description: 'Short' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('description'))).toBe(true)
    }
  })

  it('rejects description longer than 2000 chars', () => {
    const result = step2Schema.safeParse({ ...validStep2Base, description: 'A'.repeat(2001) })
    expect(result.success).toBe(false)
  })

  it('accepts description at exactly the 20-char minimum', () => {
    expect(() => step2Schema.parse({ ...validStep2Base, description: 'A'.repeat(20) })).not.toThrow()
  })

  it('accepts description at exactly the 2000-char maximum', () => {
    expect(() => step2Schema.parse({ ...validStep2Base, description: 'A'.repeat(2000) })).not.toThrow()
  })

  it('rejects non-positive area', () => {
    const result = step2Schema.safeParse({ ...validStep2Base, totalAreaInSquareMeters: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative area', () => {
    const result = step2Schema.safeParse({ ...validStep2Base, totalAreaInSquareMeters: -1 })
    expect(result.success).toBe(false)
  })

  it('requires bedroomCount for types that have rooms (casa)', () => {
    const result = step2Schema.safeParse({
      ...validStep2Base,
      propertyType: 'casa',
      bedroomCount: null,
      bathroomCount: 1,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('bedroomCount'))).toBe(true)
    }
  })

  it('requires bathroomCount for types that have rooms (departamento)', () => {
    const result = step2Schema.safeParse({
      ...validStep2Base,
      propertyType: 'departamento',
      bedroomCount: 2,
      bathroomCount: null,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('bathroomCount'))).toBe(true)
    }
  })

  it('accepts valid bedroom and bathroom counts for casa', () => {
    expect(() =>
      step2Schema.parse({
        ...validStep2Base,
        propertyType: 'casa',
        bedroomCount: 3,
        bathroomCount: 2,
      })
    ).not.toThrow()
  })

  it('rejects zero bedroom count for casa', () => {
    const result = step2Schema.safeParse({
      ...validStep2Base,
      propertyType: 'casa',
      bedroomCount: 0,
      bathroomCount: 1,
    })
    expect(result.success).toBe(false)
  })

  it('accepts null bedroomCount for types without rooms (terreno)', () => {
    expect(() =>
      step2Schema.parse({
        ...validStep2Base,
        propertyType: 'terreno',
        bedroomCount: null,
        bathroomCount: null,
      })
    ).not.toThrow()
  })

  it('rejects negative parking spaces', () => {
    const result = step2Schema.safeParse({ ...validStep2Base, availableParkingSpaces: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts zero parking spaces', () => {
    expect(() => step2Schema.parse({ ...validStep2Base, availableParkingSpaces: 0 })).not.toThrow()
  })

  it('rejects amenity strings longer than 50 chars', () => {
    const result = step2Schema.safeParse({
      ...validStep2Base,
      propertyAmenities: ['A'.repeat(51)],
    })
    expect(result.success).toBe(false)
  })

  it('rejects more than 30 amenities', () => {
    const result = step2Schema.safeParse({
      ...validStep2Base,
      propertyAmenities: Array.from({ length: 31 }, (_, i) => `amenity-${i}`),
    })
    expect(result.success).toBe(false)
  })

  it('hospedaje also requires bedroomCount (has rooms)', () => {
    const result = step2Schema.safeParse({
      ...validStep2Base,
      propertyType: 'hospedaje',
      bedroomCount: null,
      bathroomCount: 1,
    })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// step3Schema
// ---------------------------------------------------------------------------
describe('step3Schema', () => {
  it('accepts a valid location', () => {
    expect(() => step3Schema.parse(validStep3)).not.toThrow()
  })

  it('rejects latitude below -90', () => {
    const result = step3Schema.safeParse({ ...validStep3, latitude: -91 })
    expect(result.success).toBe(false)
  })

  it('rejects latitude above 90', () => {
    const result = step3Schema.safeParse({ ...validStep3, latitude: 91 })
    expect(result.success).toBe(false)
  })

  it('accepts latitude at boundaries -90 and 90', () => {
    expect(() => step3Schema.parse({ ...validStep3, latitude: -90 })).not.toThrow()
    expect(() => step3Schema.parse({ ...validStep3, latitude: 90 })).not.toThrow()
  })

  it('rejects longitude below -180', () => {
    const result = step3Schema.safeParse({ ...validStep3, longitude: -181 })
    expect(result.success).toBe(false)
  })

  it('rejects longitude above 180', () => {
    const result = step3Schema.safeParse({ ...validStep3, longitude: 181 })
    expect(result.success).toBe(false)
  })

  it('accepts longitude at boundaries -180 and 180', () => {
    expect(() => step3Schema.parse({ ...validStep3, longitude: -180 })).not.toThrow()
    expect(() => step3Schema.parse({ ...validStep3, longitude: 180 })).not.toThrow()
  })

  it('rejects empty calle', () => {
    const result = step3Schema.safeParse({ ...validStep3, calle: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty distrito', () => {
    const result = step3Schema.safeParse({ ...validStep3, distrito: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty provincia', () => {
    const result = step3Schema.safeParse({ ...validStep3, provincia: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty departamento', () => {
    const result = step3Schema.safeParse({ ...validStep3, departamento: '' })
    expect(result.success).toBe(false)
  })

  it('allows empty urbanizacion (it is optional)', () => {
    expect(() => step3Schema.parse({ ...validStep3, urbanizacion: '' })).not.toThrow()
  })

  it('rejects missing latitude (non-number)', () => {
    const result = step3Schema.safeParse({ ...validStep3, latitude: 'not-a-number' })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// step4Schema
// ---------------------------------------------------------------------------
describe('step4Schema', () => {
  it('accepts a valid step 4 payload', () => {
    expect(() => step4Schema.parse(validStep4)).not.toThrow()
  })

  it('rejects amount of 0', () => {
    const result = step4Schema.safeParse({ ...validStep4, amount: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = step4Schema.safeParse({ ...validStep4, amount: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts both valid currencies', () => {
    expect(() => step4Schema.parse({ ...validStep4, currency: 'PEN' })).not.toThrow()
    expect(() => step4Schema.parse({ ...validStep4, currency: 'USD' })).not.toThrow()
  })

  it('rejects an invalid currency', () => {
    const result = step4Schema.safeParse({ ...validStep4, currency: 'EUR' })
    expect(result.success).toBe(false)
  })

  it('accepts wantsRealtorHelp true and false', () => {
    expect(() => step4Schema.parse({ ...validStep4, wantsRealtorHelp: true })).not.toThrow()
    expect(() => step4Schema.parse({ ...validStep4, wantsRealtorHelp: false })).not.toThrow()
  })

  it('rejects maxRealtors of 0', () => {
    const result = step4Schema.safeParse({ ...validStep4, maxRealtors: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects maxRealtors above 5', () => {
    const result = step4Schema.safeParse({ ...validStep4, maxRealtors: 6 })
    expect(result.success).toBe(false)
  })

  it('accepts maxRealtors at boundary values 1 and 5', () => {
    expect(() => step4Schema.parse({ ...validStep4, maxRealtors: 1 })).not.toThrow()
    expect(() => step4Schema.parse({ ...validStep4, maxRealtors: 5 })).not.toThrow()
  })

  it('rejects fractional maxRealtors', () => {
    const result = step4Schema.safeParse({ ...validStep4, maxRealtors: 2.5 })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// fullListingSchema — pre-submission validation combining all steps
// ---------------------------------------------------------------------------
const validFull = {
  propertyType: 'casa',
  operationType: 'venta',
  role: 'owner',
  description: 'A'.repeat(20),
  totalAreaInSquareMeters: 150,
  latitude: -12.046374,
  longitude: -77.042793,
  calle: 'Av. Larco 123',
  distrito: 'Miraflores',
  provincia: 'Lima',
  departamento: 'Lima',
  amount: 200_000,
  currency: 'USD' as const,
  wantsRealtorHelp: false,
  maxRealtors: 1,
}

describe('fullListingSchema', () => {
  it('accepts a complete valid listing', () => {
    expect(() => fullListingSchema.parse(validFull)).not.toThrow()
  })

  it('rejects empty propertyType', () => {
    const result = fullListingSchema.safeParse({ ...validFull, propertyType: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty operationType', () => {
    const result = fullListingSchema.safeParse({ ...validFull, operationType: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty role', () => {
    const result = fullListingSchema.safeParse({ ...validFull, role: '' })
    expect(result.success).toBe(false)
  })

  it('rejects description shorter than 20 chars', () => {
    const result = fullListingSchema.safeParse({ ...validFull, description: 'Too short' })
    expect(result.success).toBe(false)
  })

  it('rejects non-positive totalAreaInSquareMeters', () => {
    const result = fullListingSchema.safeParse({ ...validFull, totalAreaInSquareMeters: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects out-of-range latitude', () => {
    const result = fullListingSchema.safeParse({ ...validFull, latitude: 91 })
    expect(result.success).toBe(false)
  })

  it('rejects out-of-range longitude', () => {
    const result = fullListingSchema.safeParse({ ...validFull, longitude: 181 })
    expect(result.success).toBe(false)
  })

  it('rejects empty calle', () => {
    const result = fullListingSchema.safeParse({ ...validFull, calle: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty distrito', () => {
    const result = fullListingSchema.safeParse({ ...validFull, distrito: '' })
    expect(result.success).toBe(false)
  })

  it('rejects amount of 0', () => {
    const result = fullListingSchema.safeParse({ ...validFull, amount: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects invalid currency', () => {
    const result = fullListingSchema.safeParse({ ...validFull, currency: 'GBP' })
    expect(result.success).toBe(false)
  })

  it('rejects maxRealtors above 5', () => {
    const result = fullListingSchema.safeParse({ ...validFull, maxRealtors: 6 })
    expect(result.success).toBe(false)
  })

  it('allows optional rentalDurationType to be absent', () => {
    const { rentalDurationType: _r, ...withoutRental } = { ...validFull, rentalDurationType: 'longTerm' }
    expect(() => fullListingSchema.parse(withoutRental)).not.toThrow()
  })
})
