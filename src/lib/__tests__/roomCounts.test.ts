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

// ADR-043 D4: a departamento with 0 dormitorios reads "Monoambiente", never "0 hab.".
describe('bedroomsLabel', () => {
  it('0 is Monoambiente; others are "N hab." or just N beside a label', () => {
    expect(bedroomsLabel(0)).toBe('Monoambiente')
    expect(bedroomsLabel(0, { bare: true })).toBe('Monoambiente')
    expect(bedroomsLabel(3)).toBe('3 hab.')
    expect(bedroomsLabel(3, { bare: true })).toBe('3')
  })
})
