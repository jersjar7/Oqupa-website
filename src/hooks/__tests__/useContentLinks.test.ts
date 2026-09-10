import { describe, it, expect, vi } from 'vitest'

// Mock the Firebase-backed service so importing the module does not
// trigger Firebase initialisation. Only the pure-function exports are tested.
vi.mock('@/services/contentLinkService', () => ({
  contentLinkService: {
    subscribeToMonth: vi.fn(() => () => {}),
    subscribeToShelf: vi.fn(() => () => {}),
  },
}))

import { dateKey, daysInMonth } from '../useContentLinks'

// ---------------------------------------------------------------------------
// dateKey — pure formatting function, no browser API
// ---------------------------------------------------------------------------
describe('dateKey', () => {
  it('formats a mid-year date correctly', () => {
    // month is 0-indexed: month=5 → June
    expect(dateKey(2026, 5, 15)).toBe('2026-06-15')
  })

  it('zero-pads single-digit months', () => {
    expect(dateKey(2026, 0, 1)).toBe('2026-01-01')  // January
  })

  it('zero-pads single-digit days', () => {
    expect(dateKey(2026, 11, 5)).toBe('2026-12-05')  // December 5
  })

  it('formats December (month=11) as 12', () => {
    expect(dateKey(2026, 11, 31)).toBe('2026-12-31')
  })

  it('formats January (month=0) as 01', () => {
    expect(dateKey(2027, 0, 1)).toBe('2027-01-01')
  })

  it('uses local date fields, not UTC (by construction)', () => {
    // The function manually formats year/month/day — no toISOString() timezone shift.
    const result = dateKey(2026, 8, 10) // September 10
    expect(result).toBe('2026-09-10')
  })
})

// ---------------------------------------------------------------------------
// daysInMonth — generates an array of date keys for every day in a month
// ---------------------------------------------------------------------------
describe('daysInMonth', () => {
  it('returns 31 days for January', () => {
    const days = daysInMonth(2026, 0) // January (0-indexed)
    expect(days).toHaveLength(31)
  })

  it('returns 28 days for February in a non-leap year', () => {
    const days = daysInMonth(2025, 1)
    expect(days).toHaveLength(28)
  })

  it('returns 29 days for February in a leap year', () => {
    const days = daysInMonth(2024, 1) // 2024 is a leap year
    expect(days).toHaveLength(29)
  })

  it('returns 30 days for April', () => {
    const days = daysInMonth(2026, 3) // April
    expect(days).toHaveLength(30)
  })

  it('returns 31 days for December', () => {
    const days = daysInMonth(2026, 11)
    expect(days).toHaveLength(31)
  })

  it('first element is the first day of the month', () => {
    const days = daysInMonth(2026, 8) // September 2026
    expect(days[0]).toBe('2026-09-01')
  })

  it('last element is the last day of the month', () => {
    const days = daysInMonth(2026, 8) // September 2026
    expect(days[days.length - 1]).toBe('2026-09-30')
  })

  it('all keys are in YYYY-MM-DD format', () => {
    const days = daysInMonth(2026, 5) // June
    for (const key of days) {
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('consecutive days are returned in order', () => {
    const days = daysInMonth(2026, 5) // June
    for (let i = 0; i < days.length - 1; i++) {
      expect(days[i]! < days[i + 1]!).toBe(true)
    }
  })

  it('months are 1-indexed in the output even though month param is 0-indexed', () => {
    // month=5 → June → '06' in the key
    const days = daysInMonth(2026, 5)
    expect(days[0]).toMatch(/^2026-06-/)
  })
})
