import { describe, it, expect } from 'vitest'
import { parseLocaleNumber, parseCount, MALFORMED_NUMBER } from '../localeNumber'

// What people type into the area and price boxes (ADR-043 wizard bugs, step 3).
// A comma is a decimal point ("120,5" = 120.5), as in the app — but a comma
// followed by exactly three digits is a thousands separator, so "250,000" is
// still two hundred and fifty thousand, never 250.
describe('parseLocaleNumber', () => {
  it('an empty box is "nothing typed", not zero', () => {
    expect(parseLocaleNumber('')).toBeUndefined()
    expect(parseLocaleNumber('   ')).toBeUndefined()
  })

  it('plain numbers', () => {
    expect(parseLocaleNumber('120')).toBe(120)
    expect(parseLocaleNumber('0')).toBe(0)
    expect(parseLocaleNumber(' 85 ')).toBe(85)
  })

  it('a comma is the decimal point', () => {
    expect(parseLocaleNumber('120,5')).toBe(120.5)
    expect(parseLocaleNumber('120,50')).toBe(120.5)
    expect(parseLocaleNumber('0,75')).toBe(0.75)
  })

  it('a dot is a decimal point too', () => {
    expect(parseLocaleNumber('120.5')).toBe(120.5)
    expect(parseLocaleNumber('1.5')).toBe(1.5)
  })

  it('three digits after the last separator are thousands', () => {
    expect(parseLocaleNumber('1,500')).toBe(1500)
    expect(parseLocaleNumber('250,000')).toBe(250000)
    expect(parseLocaleNumber('1.500')).toBe(1500)
    expect(parseLocaleNumber('1,000,000')).toBe(1000000)
  })

  it('thousands and a decimal together, either way round', () => {
    expect(parseLocaleNumber('1,500.50')).toBe(1500.5)
    expect(parseLocaleNumber('1.500,50')).toBe(1500.5)
  })

  it('the currency the person may type is ignored', () => {
    expect(parseLocaleNumber('S/ 1,500')).toBe(1500)
    expect(parseLocaleNumber('US$ 80,000')).toBe(80000)
    expect(parseLocaleNumber('$90')).toBe(90)
  })

  it('anything else is not a number', () => {
    expect(parseLocaleNumber('abc')).toBeNaN()
    expect(parseLocaleNumber('12a')).toBeNaN()
    expect(parseLocaleNumber('-5')).toBeNaN()
    expect(parseLocaleNumber(',')).toBeNaN()
  })
})

describe('parseCount (dormitorios, baños, estacionamientos)', () => {
  it('an empty box is "nothing typed"', () => {
    expect(parseCount('')).toBeNull()
  })
  it('whole numbers, zero included', () => {
    expect(parseCount('0')).toBe(0)
    expect(parseCount('3')).toBe(3)
  })
  it('a half is kept as typed, so the check can explain it', () => {
    expect(parseCount('1.5')).toBe(1.5)
    expect(parseCount('1,5')).toBe(1.5)
  })
  it('letters are not a number', () => {
    expect(parseCount('dos')).toBeNaN()
  })
})

// Hostile review of fix/wizard-bugs-web (2026-11-02).
describe('the currency prefix, dot included (review #2)', () => {
  it('"S/. 800" is 800, not 0.80', () => {
    expect(parseLocaleNumber('S/. 800')).toBe(800)
    expect(parseLocaleNumber('S/.800')).toBe(800)
    expect(parseLocaleNumber('S/. 1,500')).toBe(1500)
    expect(parseLocaleNumber('s/. 800')).toBe(800)
  })
})

describe('strict reading, the same rule as the app (review #5)', () => {
  it('properly grouped thousands', () => {
    expect(parseLocaleNumber('1,500')).toBe(1500)
    expect(parseLocaleNumber('1.500')).toBe(1500)
    expect(parseLocaleNumber('1,500,000')).toBe(1500000)
    expect(parseLocaleNumber('250.000')).toBe(250000)
  })
  it('one or two digits after the last separator are decimals', () => {
    expect(parseLocaleNumber('120,5')).toBe(120.5)
    expect(parseLocaleNumber('120.75')).toBe(120.75)
    expect(parseLocaleNumber('1,500.50')).toBe(1500.5)
  })
  it('anything else is a separator too many', () => {
    for (const bad of ['12,345,6', '1,2,3', '1.5.0', '1,0000', '1.500.50', '12,34,567', '1,50,000']) {
      expect(parseLocaleNumber(bad), bad).toBe(MALFORMED_NUMBER)
    }
  })
})
