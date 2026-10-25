// How many filters are on, for the Filtros buttons (UX review 2026-10-25).
// Venta/Alquiler is not a filter here: it always has a value and is shown.
import { describe, it, expect } from 'vitest'
import { activeFilterCount } from '../filterCount'

const base = { operationType: 'venta' as const, rentalDurationType: null, propertyTypes: [], priceMin: null, priceMax: null }

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
