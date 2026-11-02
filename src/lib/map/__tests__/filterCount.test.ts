// How many filters are on, for the Filtros buttons (UX review 2026-10-25).
// Venta/Alquiler is not a filter here: it always has a value and is shown.
import { describe, it, expect } from 'vitest'
import { activeFilterCount, clearedFilters, priceRangeInvalid } from '../filterCount'

const base = { operationType: 'venta' as const, rentalDurationType: null, propertyTypes: [], priceMin: null, priceMax: null, priceCurrency: 'USD' as const }

describe('activeFilterCount', () => {
  it('none', () => expect(activeFilterCount(base)).toBe(0))
  it('each type, each price end and the rental period count once', () => {
    expect(activeFilterCount({ ...base, propertyTypes: ['casa', 'terreno'] })).toBe(2)
    expect(activeFilterCount({ ...base, priceMin: 1000, priceMax: 5000 })).toBe(2)
    expect(activeFilterCount({ ...base, operationType: 'alquiler', rentalDurationType: 'longTerm' })).toBe(1)
  })
})

// The button that closes the filters says how many listings they leave
// (2026-10-25): it replaced "8 de 19 propiedades", a line with nothing to
// tap, at the bottom of the phone's filter panel.
import { filtersDoneLabel } from '../filterCount'
describe('filtersDoneLabel', () => {
  it('Listo · N en venta / en alquiler', () => {
    expect(filtersDoneLabel(8, true)).toBe('Listo · 8 en venta')
    expect(filtersDoneLabel(1, false)).toBe('Listo · 1 en alquiler')
  })
})

// "Limpiar" (audit 2026-11-02): every filter off, Venta/Alquiler and the
// chosen price currency kept.
describe('clearedFilters', () => {
  it('turns every filter off and keeps the operation and the currency', () => {
    const busy = { operationType: 'alquiler' as const, rentalDurationType: 'longTerm' as const, propertyTypes: ['casa'], priceMin: 1, priceMax: 9, priceCurrency: 'PEN' as const }
    const out = clearedFilters(busy)
    expect(out).toEqual({ operationType: 'alquiler', rentalDurationType: null, propertyTypes: [], priceMin: null, priceMax: null, priceCurrency: 'PEN' })
    expect(activeFilterCount(out)).toBe(0)
  })
})

describe('priceRangeInvalid', () => {
  it('only when both are set and min > max', () => {
    expect(priceRangeInvalid({ ...base, priceMin: 900, priceMax: 100 })).toBe(true)
    expect(priceRangeInvalid({ ...base, priceMin: 100, priceMax: 100 })).toBe(false)
    expect(priceRangeInvalid({ ...base, priceMin: 900 })).toBe(false)
  })
})
