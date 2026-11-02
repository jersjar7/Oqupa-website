// Room counts read in correct Spanish, and a stored 0 bathrooms is not shown
// ("0 baños"), for every property type — as the app does (coordinator,
// 2026-11-02).
import { describe, it, expect } from 'vitest'
import { bathroomsLabel } from '../roomCounts'

describe('bathroomsLabel', () => {
  it('singular for one', () => expect(bathroomsLabel(1)).toBe('1 baño'))
  it('plural for more', () => expect(bathroomsLabel(3)).toBe('3 baños'))
  it('nothing for 0, null or undefined', () => {
    expect(bathroomsLabel(0)).toBeNull()
    expect(bathroomsLabel(null)).toBeNull()
    expect(bathroomsLabel(undefined)).toBeNull()
  })
})
