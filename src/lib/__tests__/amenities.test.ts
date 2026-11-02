import { describe, it, expect } from 'vitest'
import { amenitySuggestions, customAmenityError, STANDARD_AMENITIES, SHORT_STAY_AMENITIES } from '../amenities'

describe('amenities — the app\'s lists and rules (ADR-043 D12)', () => {
  it('19 standard, 15 for short stays, as in the app', () => {
    expect(STANDARD_AMENITIES).toHaveLength(19)
    expect(SHORT_STAY_AMENITIES).toHaveLength(15)
    expect(amenitySuggestions(false)[0]).toBe('Piscina')
    expect(amenitySuggestions(true)[0]).toBe('WiFi')
  })

  it('a typed amenity follows the app\'s rules', () => {
    expect(customAmenityError('', [])).toBe('Ingresa una característica')
    expect(customAmenityError('uno dos tres cuatro', [])).toBe('Máximo 3 palabras')
    expect(customAmenityError('a'.repeat(51), [])).toBe('Máximo 50 caracteres')
    expect(customAmenityError('PISCINA', ['Piscina'])).toBe('Ya existe')
    expect(customAmenityError('Huerto', Array.from({ length: 30 }, (_, i) => `x${i}`))).toBe('Máximo 30 características')
    expect(customAmenityError(' Huerto ', [])).toBeNull()
  })
})
