// Room counts read in correct Spanish, and a stored 0 bathrooms is not shown
// ("0 baños"), for every property type — as the app does (coordinator,
// 2026-11-02).
import { describe, it, expect } from 'vitest'
import { bathroomsLabel, bedroomsLabel } from '../roomCounts'

describe('bathroomsLabel', () => {
  it('singular for one', () => expect(bathroomsLabel(1)).toBe('1 baño'))
  it('plural for more', () => expect(bathroomsLabel(3)).toBe('3 baños'))
  it('nothing for 0, null or undefined', () => {
    expect(bathroomsLabel(0)).toBeNull()
    expect(bathroomsLabel(null)).toBeNull()
    expect(bathroomsLabel(undefined)).toBeNull()
  })
})

// ADR-043 D4: a Departamento with 0 dormitorios reads "Monoambiente", never
// "0 hab."; no other type is ever called a Monoambiente (hostile review).
describe('bedroomsLabel', () => {
  // ADR-053 (Jerson 2026-11-06): no "Monoambiente" word; 0 stays 0 — "We
  // don't need to lie for them." Every type, as in the app.
  it('a saved 0 reads 0; others are "N hab." or just N beside a label', () => {
    expect(bedroomsLabel(0, { propertyType: 'departamento' })).toBe('0 hab.')
    expect(bedroomsLabel(0, { bare: true, propertyType: 'departamento' })).toBe('0')
    expect(bedroomsLabel(3, { propertyType: 'departamento' })).toBe('3 hab.')
    expect(bedroomsLabel(3, { bare: true })).toBe('3')
  })
  it('never the word Monoambiente, for any type', () => {
    for (const t of ['departamento', 'casa', 'hospedaje', 'habitacion', undefined]) {
      expect(bedroomsLabel(0, { propertyType: t })).toBe('0 hab.')
      expect(bedroomsLabel(0, { bare: true, propertyType: t })).toBe('0')
    }
  })
})
