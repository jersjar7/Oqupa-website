import { describe, it, expect } from 'vitest'
import {
  PropertyType,
  OperationType,
  RentalDurationType,
  ListingStatus,
  ListingRole,
  Currency,
  ContactTimeSlot,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPE_SHORT_LABELS,
  PROPERTY_TYPE_DESCRIPTIONS,
  OPERATION_TYPE_LABELS,
  RENTAL_DURATION_TYPE_LABELS,
  RENTAL_DURATION_PRICE_SUFFIX,
  VENTA_PROPERTY_TYPES,
  ALQUILER_LONG_TERM_PROPERTY_TYPES,
  ALQUILER_SHORT_TERM_PROPERTY_TYPES,
  ALQUILER_ALL_PROPERTY_TYPES,
  isAlquilerOnlyType,
  propertyTypeHasRooms,
  propertyTypeIsRoom,
  LISTING_STATUS_LABELS,
  LISTING_ROLE_LABELS,
  CONTACT_TIME_SLOT_LABELS,
  CURRENCY_SYMBOLS,
} from '../enums'

// ---------------------------------------------------------------------------
// Enum values
// ---------------------------------------------------------------------------

describe('PropertyType enum values', () => {
  it('contains all expected keys', () => {
    const keys = Object.keys(PropertyType)
    expect(keys).toContain('casa')
    expect(keys).toContain('departamento')
    expect(keys).toContain('terreno')
    expect(keys).toContain('oficina')
    expect(keys).toContain('local')
    expect(keys).toContain('hospedaje')
    expect(keys).toContain('habitacion')
    expect(keys).toHaveLength(7)
  })

  it('values are string literals equal to their keys', () => {
    for (const [k, v] of Object.entries(PropertyType)) {
      expect(v).toBe(k)
    }
  })
})

describe('OperationType enum values', () => {
  it('contains venta and alquiler', () => {
    expect(OperationType.venta).toBe('venta')
    expect(OperationType.alquiler).toBe('alquiler')
  })
})

describe('Currency enum values', () => {
  it('contains PEN and USD', () => {
    expect(Currency.PEN).toBe('PEN')
    expect(Currency.USD).toBe('USD')
  })
})

describe('RentalDurationType enum values', () => {
  it('contains longTerm and shortTerm', () => {
    expect(RentalDurationType.longTerm).toBe('longTerm')
    expect(RentalDurationType.shortTerm).toBe('shortTerm')
  })
})

describe('ListingStatus enum values', () => {
  it('contains all 7 statuses', () => {
    expect(Object.keys(ListingStatus)).toHaveLength(7)
    expect(ListingStatus.active).toBe('active')
    expect(ListingStatus.draft).toBe('draft')
    expect(ListingStatus.expired).toBe('expired')
  })
})

// ---------------------------------------------------------------------------
// Display label maps
// ---------------------------------------------------------------------------

describe('PROPERTY_TYPE_LABELS', () => {
  it('has an entry for every PropertyType', () => {
    for (const type of Object.values(PropertyType)) {
      expect(PROPERTY_TYPE_LABELS[type]).toBeDefined()
      expect(PROPERTY_TYPE_LABELS[type].length).toBeGreaterThan(0)
    }
  })

  it('maps departamento to "Apartamento"', () => {
    expect(PROPERTY_TYPE_LABELS.departamento).toBe('Apartamento')
  })

  it('maps habitacion to "Cuarto"', () => {
    expect(PROPERTY_TYPE_LABELS.habitacion).toBe('Cuarto')
  })
})

describe('PROPERTY_TYPE_SHORT_LABELS', () => {
  it('has an entry for every PropertyType', () => {
    for (const type of Object.values(PropertyType)) {
      expect(PROPERTY_TYPE_SHORT_LABELS[type]).toBeDefined()
    }
  })

  it('maps departamento to abbreviated "Apto."', () => {
    expect(PROPERTY_TYPE_SHORT_LABELS.departamento).toBe('Apto.')
  })

  it('maps hospedaje to "Aloja."', () => {
    expect(PROPERTY_TYPE_SHORT_LABELS.hospedaje).toBe('Aloja.')
  })
})

describe('PROPERTY_TYPE_DESCRIPTIONS', () => {
  it('has a non-empty description for every PropertyType', () => {
    for (const type of Object.values(PropertyType)) {
      expect(PROPERTY_TYPE_DESCRIPTIONS[type]).toBeDefined()
      expect(PROPERTY_TYPE_DESCRIPTIONS[type].length).toBeGreaterThan(0)
    }
  })
})

describe('OPERATION_TYPE_LABELS', () => {
  it('maps venta to "Venta"', () => {
    expect(OPERATION_TYPE_LABELS.venta).toBe('Venta')
  })

  it('maps alquiler to "Alquiler"', () => {
    expect(OPERATION_TYPE_LABELS.alquiler).toBe('Alquiler')
  })
})

describe('RENTAL_DURATION_TYPE_LABELS', () => {
  it('maps longTerm to "Largo plazo"', () => {
    expect(RENTAL_DURATION_TYPE_LABELS.longTerm).toBe('Largo plazo')
  })

  it('maps shortTerm to "Corto plazo"', () => {
    expect(RENTAL_DURATION_TYPE_LABELS.shortTerm).toBe('Corto plazo')
  })
})

describe('RENTAL_DURATION_PRICE_SUFFIX', () => {
  it('longTerm suffix is /mes', () => {
    expect(RENTAL_DURATION_PRICE_SUFFIX.longTerm).toBe('/mes')
  })

  it('shortTerm suffix is /noche', () => {
    expect(RENTAL_DURATION_PRICE_SUFFIX.shortTerm).toBe('/noche')
  })
})

describe('CURRENCY_SYMBOLS', () => {
  it('PEN maps to S/.', () => {
    expect(CURRENCY_SYMBOLS.PEN).toBe('S/.')
  })

  it('USD maps to US$', () => {
    expect(CURRENCY_SYMBOLS.USD).toBe('US$')
  })
})

describe('LISTING_STATUS_LABELS', () => {
  it('has a label for every ListingStatus', () => {
    for (const status of Object.values(ListingStatus)) {
      expect(LISTING_STATUS_LABELS[status]).toBeDefined()
    }
  })

  it('maps active to "Activo"', () => {
    expect(LISTING_STATUS_LABELS.active).toBe('Activo')
  })
})

describe('LISTING_ROLE_LABELS', () => {
  it('has a label for every ListingRole', () => {
    for (const role of Object.values(ListingRole)) {
      expect(LISTING_ROLE_LABELS[role]).toBeDefined()
    }
  })
})

describe('CONTACT_TIME_SLOT_LABELS', () => {
  it('has a label for every ContactTimeSlot', () => {
    for (const slot of Object.values(ContactTimeSlot)) {
      expect(CONTACT_TIME_SLOT_LABELS[slot]).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// Property type lists
// ---------------------------------------------------------------------------

describe('VENTA_PROPERTY_TYPES', () => {
  it('includes casa and departamento', () => {
    expect(VENTA_PROPERTY_TYPES).toContain('casa')
    expect(VENTA_PROPERTY_TYPES).toContain('departamento')
  })

  it('excludes hospedaje and habitacion (alquiler-only types)', () => {
    expect(VENTA_PROPERTY_TYPES).not.toContain('hospedaje')
    expect(VENTA_PROPERTY_TYPES).not.toContain('habitacion')
  })
})

describe('ALQUILER_LONG_TERM_PROPERTY_TYPES', () => {
  it('includes habitacion for long-term rentals', () => {
    expect(ALQUILER_LONG_TERM_PROPERTY_TYPES).toContain('habitacion')
  })

  it('excludes hospedaje (short-term only)', () => {
    expect(ALQUILER_LONG_TERM_PROPERTY_TYPES).not.toContain('hospedaje')
  })
})

describe('ALQUILER_SHORT_TERM_PROPERTY_TYPES', () => {
  it('includes hospedaje for short-term rentals', () => {
    expect(ALQUILER_SHORT_TERM_PROPERTY_TYPES).toContain('hospedaje')
  })

  it('includes habitacion', () => {
    expect(ALQUILER_SHORT_TERM_PROPERTY_TYPES).toContain('habitacion')
  })
})

describe('ALQUILER_ALL_PROPERTY_TYPES', () => {
  it('is the union of long-term and short-term types', () => {
    const combined = new Set([
      ...ALQUILER_LONG_TERM_PROPERTY_TYPES,
      ...ALQUILER_SHORT_TERM_PROPERTY_TYPES,
    ])
    expect(ALQUILER_ALL_PROPERTY_TYPES.length).toBe(combined.size)
    for (const t of combined) {
      expect(ALQUILER_ALL_PROPERTY_TYPES).toContain(t)
    }
  })
})

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

describe('isAlquilerOnlyType', () => {
  it('returns true for hospedaje', () => {
    expect(isAlquilerOnlyType('hospedaje')).toBe(true)
  })

  it('returns true for habitacion', () => {
    expect(isAlquilerOnlyType('habitacion')).toBe(true)
  })

  it('returns false for casa', () => {
    expect(isAlquilerOnlyType('casa')).toBe(false)
  })

  it('returns false for departamento', () => {
    expect(isAlquilerOnlyType('departamento')).toBe(false)
  })

  it('returns false for all venta-compatible types', () => {
    for (const type of VENTA_PROPERTY_TYPES) {
      expect(isAlquilerOnlyType(type)).toBe(false)
    }
  })
})

describe('propertyTypeHasRooms', () => {
  it('returns true for casa', () => {
    expect(propertyTypeHasRooms('casa')).toBe(true)
  })

  it('returns true for departamento', () => {
    expect(propertyTypeHasRooms('departamento')).toBe(true)
  })

  it('returns true for hospedaje', () => {
    expect(propertyTypeHasRooms('hospedaje')).toBe(true)
  })

  it('returns false for terreno', () => {
    expect(propertyTypeHasRooms('terreno')).toBe(false)
  })

  it('returns false for local', () => {
    expect(propertyTypeHasRooms('local')).toBe(false)
  })

  it('returns false for oficina', () => {
    expect(propertyTypeHasRooms('oficina')).toBe(false)
  })

  it('returns false for habitacion (it IS a room, does not HAVE rooms)', () => {
    expect(propertyTypeHasRooms('habitacion')).toBe(false)
  })
})

describe('propertyTypeIsRoom', () => {
  it('returns true only for habitacion', () => {
    expect(propertyTypeIsRoom('habitacion')).toBe(true)
  })

  it('returns false for every other type', () => {
    const others = Object.values(PropertyType).filter((t) => t !== 'habitacion')
    for (const type of others) {
      expect(propertyTypeIsRoom(type)).toBe(false)
    }
  })
})
