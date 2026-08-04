import { describe, it, expect } from 'vitest'
import { formatShortPrice } from '../formatters'
import { Currency } from '@/types/enums'

/**
 * Map-pin price formatting.
 *
 * Users in Peru read `S/. 540K` as **kilómetros** (real feedback, 2026-08-03),
 * and the currency symbol next to it did not prevent it. 47 of the 50
 * production listings sat in that band, so the ambiguity was on nearly every
 * sale pin on the map.
 *
 * THESE CASES ARE MIRRORED IN THE APP'S price_formatter_map_bubble_test.dart.
 * Both platforms draw the same pins on the same map; if they drift, the same
 * property costs different-looking money depending on the device. When you
 * change one, change the other.
 */
const soles = (amount: number) => formatShortPrice(amount, Currency.PEN)
const dollars = (amount: number) => formatShortPrice(amount, Currency.USD)

describe('thousands read as "mil", never as K', () => {
  it('formats the most common production prices', () => {
    expect(soles(540_000)).toBe('S/. 540 mil')
    expect(soles(111_000)).toBe('S/. 111 mil')
    expect(soles(850_000)).toBe('S/. 850 mil')
    expect(dollars(300_000)).toBe('US$ 300 mil')
  })

  it('never emits a bare K', () => {
    for (const amount of [1_000, 42_000, 540_000, 999_999]) {
      expect(soles(amount)).not.toContain('K')
    }
  })

  it('handles the boundary at one thousand', () => {
    expect(soles(999)).toBe('S/. 999')
    expect(soles(1_000)).toBe('S/. 1 mil')
  })

  it('rounds to whole thousands rather than showing decimals', () => {
    expect(soles(155_232)).toBe('S/. 155 mil')
    expect(soles(42_500)).toBe('S/. 43 mil')
  })
})

describe('millions are written out, not abbreviated to M', () => {
  // "M" carries the same failure as "K": in Spanish it also reads as metros.
  it('uses the singular for exactly one million, with no trailing .0', () => {
    expect(soles(1_000_000)).toBe('S/. 1 millón')
  })

  it('uses the plural above one million', () => {
    expect(soles(2_000_000)).toBe('S/. 2 millones')
    expect(dollars(1_200_000)).toBe('US$ 1.2 millones')
  })

  it('never emits a bare M', () => {
    for (const amount of [1_000_000, 1_200_000, 5_400_000]) {
      expect(soles(amount)).not.toMatch(/\d\s*M\b/)
    }
  })

  it('handles the boundary at one million', () => {
    expect(soles(999_999)).toBe('S/. 1000 mil')
    expect(soles(1_000_000)).toBe('S/. 1 millón')
  })
})

describe('small amounts are shown exactly', () => {
  it('does not abbreviate a three-figure price', () => {
    expect(soles(850)).toBe('S/. 850')
    expect(dollars(23)).toBe('US$ 23')
  })
})

describe('the two platforms agree', () => {
  // Every value here is asserted to the identical string in the Flutter suite.
  // If one platform changes, this table is where the drift shows up.
  const shared: Array<[number, Currency, string]> = [
    [540_000, Currency.PEN, 'S/. 540 mil'],
    [111_000, Currency.PEN, 'S/. 111 mil'],
    [850_000, Currency.PEN, 'S/. 850 mil'],
    [155_232, Currency.PEN, 'S/. 155 mil'],
    [1_000, Currency.PEN, 'S/. 1 mil'],
    [999, Currency.PEN, 'S/. 999'],
    [850, Currency.PEN, 'S/. 850'],
    [1_000_000, Currency.PEN, 'S/. 1 millón'],
    [2_000_000, Currency.PEN, 'S/. 2 millones'],
    [300_000, Currency.USD, 'US$ 300 mil'],
    [1_200_000, Currency.USD, 'US$ 1.2 millones'],
    [23, Currency.USD, 'US$ 23'],
  ]

  it.each(shared)('%d %s renders as %s on both platforms', (amount, currency, expected) => {
    expect(formatShortPrice(amount, currency)).toBe(expected)
  })
})
