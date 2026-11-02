import { describe, it, expect } from 'vitest'
import {
  step1Schema,
  step2Schema,
  step3Schema,
  step4Schema,
  fullListingSchema,
} from '../listingSchema'

// ADR-043 step 3 (wizard bugs). Every message the wizard can show is Spanish,
// zero bedrooms is allowed, an empty parking box is allowed, a half bathroom
// is refused in Spanish (the app takes whole numbers only), and the limits
// match the app word for word.

const ENGLISH = /invalid|expected|received|too (small|big)|must|number|string|input|option/i

function messages(schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string; path: PropertyKey[] }[] } } }, value: unknown) {
  const r = schema.safeParse(value)
  return r.success ? [] : r.error!.issues
}

const room = {
  propertyType: 'casa',
  description: 'Casa amplia y luminosa cerca del parque',
  totalAreaInSquareMeters: 120,
  bedroomCount: 3,
  bathroomCount: 2,
  availableParkingSpaces: 0,
  propertyAmenities: [],
}

const step4 = { operationType: 'venta', amount: 100000, currency: 'PEN', wantsRealtorHelp: false, maxRealtors: 3 }

function msgFor(issues: { message: string; path: PropertyKey[] }[], field: string) {
  return issues.find((i) => i.path.includes(field))?.message
}

describe('every wizard message is Spanish', () => {
  const garbage: unknown[] = [NaN, 'abc', -1, 1.5, 1e12, undefined, null, {}, '']
  const cases: Array<[string, Parameters<typeof messages>[0], Record<string, unknown>, string[]]> = [
    ['step1', step1Schema, { propertyType: 'casa', operationType: 'alquiler', role: 'owner', rentalDurationType: 'longTerm' }, ['propertyType', 'operationType', 'role', 'rentalDurationType']],
    ['step2', step2Schema, room, ['description', 'totalAreaInSquareMeters', 'bedroomCount', 'bathroomCount', 'availableParkingSpaces', 'propertyAmenities', 'hasPrivateBathroom']],
    ['step3', step3Schema, { latitude: -5.19, longitude: -80.63, calle: 'Av. Grau 1', urbanizacion: '', distrito: 'Piura', provincia: 'Piura', departamento: 'Piura' }, ['latitude', 'longitude', 'calle', 'urbanizacion', 'distrito', 'provincia', 'departamento']],
    ['step4', step4Schema, step4, ['amount', 'currency', 'wantsRealtorHelp', 'maxRealtors']],
  ]
  for (const [name, schema, valid, fields] of cases) {
    for (const field of fields) {
      it(`${name}.${field}: no English for any bad value`, () => {
        for (const bad of garbage) {
          for (const issue of messages(schema, { ...valid, [field]: bad })) {
            expect(issue.message, `${field}=${String(bad)}`).not.toMatch(ENGLISH)
          }
        }
      })
    }
  }

  it('the pre-publish check is Spanish too', () => {
    for (const field of ['latitude', 'longitude', 'maxRealtors', 'amount', 'totalAreaInSquareMeters']) {
      for (const bad of garbage) {
        for (const issue of messages(fullListingSchema, { [field]: bad })) {
          expect(issue.message, `${field}=${String(bad)}`).not.toMatch(ENGLISH)
        }
      }
    }
  })

  it('amenities refused in Spanish', () => {
    expect(msgFor(messages(step2Schema, { ...room, propertyAmenities: ['A'.repeat(51)] }), 'propertyAmenities')).not.toMatch(ENGLISH)
    expect(msgFor(messages(step2Schema, { ...room, propertyAmenities: Array.from({ length: 31 }, (_, i) => `a${i}`) }), 'propertyAmenities')).not.toMatch(ENGLISH)
  })
})

describe('Detalles', () => {
  // As the app: 0 dormitorios / 0 baños refused for these three types, with
  // the app's sentences and the website's own type label (Monoambiente is
  // ADR-043 step 4, on both platforms together).
  const zeroCases: Array<[string, string, string]> = [
    ['casa', 'Una casa necesita al menos 1 dormitorio.', 'Una casa necesita al menos 1 baño.'],
    ['departamento', 'Un departamento necesita al menos 1 dormitorio.', 'Un departamento necesita al menos 1 baño.'],
    ['hospedaje', 'Un alojamiento necesita al menos 1 dormitorio.', 'Un alojamiento necesita al menos 1 baño.'],
  ]
  for (const [propertyType, bedroom, bathroom] of zeroCases) {
    it(`${propertyType}: 0 bedrooms and 0 bathrooms are refused, saying why`, () => {
      const issues = messages(step2Schema, { ...room, propertyType, bedroomCount: 0, bathroomCount: 0 })
      expect(msgFor(issues, 'bedroomCount')).toBe(bedroom)
      expect(msgFor(issues, 'bathroomCount')).toBe(bathroom)
    })
  }

  it('oficina and local: bathrooms are not asked, so 0 is fine', () => {
    for (const propertyType of ['oficina', 'local']) {
      expect(messages(step2Schema, { ...room, propertyType, bedroomCount: null, bathroomCount: 0 })).toEqual([])
    }
  })

  it('an empty parking box is allowed', () => {
    // The box is read as "nothing typed" = no parking.
    expect(messages(step2Schema, { ...room, availableParkingSpaces: null })).toEqual([])
    expect(messages(step2Schema, { ...room, availableParkingSpaces: undefined })).toEqual([])
  })

  it('a half bathroom is refused in Spanish (the app takes whole numbers only)', () => {
    expect(msgFor(messages(step2Schema, { ...room, bathroomCount: 1.5 }), 'bathroomCount')).toBe('Escribe un número entero, sin decimales.')
    expect(msgFor(messages(step2Schema, { ...room, bedroomCount: 2.5 }), 'bedroomCount')).toBe('Escribe un número entero, sin decimales.')
    expect(msgFor(messages(step2Schema, { ...room, availableParkingSpaces: 1.5 }), 'availableParkingSpaces')).toBe('Escribe un número entero, sin decimales.')
  })

  it('letters in a number box', () => {
    expect(msgFor(messages(step2Schema, { ...room, totalAreaInSquareMeters: NaN }), 'totalAreaInSquareMeters')).toBe('Escribe solo números.')
    expect(msgFor(messages(step2Schema, { ...room, bedroomCount: NaN }), 'bedroomCount')).toBe('Escribe solo números.')
    expect(msgFor(messages(step2Schema, { ...room, availableParkingSpaces: NaN }), 'availableParkingSpaces')).toBe('Escribe solo números.')
  })

  it('an empty area box asks for the area', () => {
    expect(msgFor(messages(step2Schema, { ...room, totalAreaInSquareMeters: undefined }), 'totalAreaInSquareMeters')).toBe('Ingresa el área.')
  })

  it('limits: 50 rooms, bathrooms and parking spaces', () => {
    expect(messages(step2Schema, { ...room, bedroomCount: 50, bathroomCount: 50, availableParkingSpaces: 50 })).toEqual([])
    const over = messages(step2Schema, { ...room, bedroomCount: 51, bathroomCount: 51, availableParkingSpaces: 51 })
    expect(msgFor(over, 'bedroomCount')).toBe('Máximo 50.')
    expect(msgFor(over, 'bathroomCount')).toBe('Máximo 50.')
    expect(msgFor(over, 'availableParkingSpaces')).toBe('Máximo 50.')
  })

  it('limit: area up to 1,000,000 m²', () => {
    expect(messages(step2Schema, { ...room, totalAreaInSquareMeters: 1_000_000 })).toEqual([])
    expect(msgFor(messages(step2Schema, { ...room, totalAreaInSquareMeters: 1_000_001 }), 'totalAreaInSquareMeters')).toBe('El área máxima es 1,000,000 m².')
  })
})

describe('Precio', () => {
  it('limit: price up to 999,999,999', () => {
    expect(messages(step4Schema, { ...step4, amount: 999_999_999 })).toEqual([])
    expect(msgFor(messages(step4Schema, { ...step4, amount: 1_000_000_000 }), 'amount')).toBe('Revisa el precio: es demasiado alto.')
  })

  it('the pre-publish check applies the same price limit', () => {
    const issues = messages(fullListingSchema, { amount: 1_000_000_000 })
    expect(msgFor(issues, 'amount')).toBe('Revisa el precio: es demasiado alto.')
  })
})
