// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock the Firebase-backed service so importing the module does not
// trigger Firebase initialisation.
let subscribeToMonthMock: Mock
let subscribeToShelfMock: Mock

vi.mock('@/services/contentLinkService', () => ({
  get contentLinkService() {
    return {
      subscribeToMonth: (...args: unknown[]) => subscribeToMonthMock(...args),
      subscribeToShelf: (...args: unknown[]) => subscribeToShelfMock(...args),
    }
  },
}))

import { dateKey, daysInMonth, useContentLinks, useShelvedLinks } from '../useContentLinks'
import type { ContentLink } from '@/types/contentLink'

// ---------------------------------------------------------------------------
// Fixture helper
// ---------------------------------------------------------------------------

beforeEach(() => {
  subscribeToMonthMock = vi.fn(() => () => {})
  subscribeToShelfMock = vi.fn(() => () => {})
})

function mkLink(id: string, date: string | null, createdAt = new Date(2026, 0, 1)): ContentLink {
  return {
    id,
    date,
    url: `https://example.com/${id}`,
    createdAt,
    createdByEmail: 'user@test.com',
  }
}

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

// ---------------------------------------------------------------------------
// useContentLinks — reactive hook (mocked service)
// ---------------------------------------------------------------------------
describe('useContentLinks', () => {
  it('starts with isLoading=true and empty byDate', () => {
    subscribeToMonthMock.mockImplementation(() => () => {})

    const { result } = renderHook(() => useContentLinks(2026, 8))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.byDate).toEqual({})
    expect(result.current.error).toBeNull()
  })

  it('groups links by date when the service delivers them', async () => {
    const links = [
      mkLink('a', '2026-09-10', new Date(2026, 8, 10, 10, 0)),
      mkLink('b', '2026-09-10', new Date(2026, 8, 10, 11, 0)),
      mkLink('c', '2026-09-15'),
    ]

    subscribeToMonthMock.mockImplementation(
      (_first: string, _last: string, onData: (links: ContentLink[]) => void) => {
        // Call onData synchronously to simulate immediate Firestore snapshot
        onData(links)
        return () => {}
      },
    )

    const { result } = renderHook(() => useContentLinks(2026, 8))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.byDate['2026-09-10']).toHaveLength(2)
    expect(result.current.byDate['2026-09-15']).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('sorts links within a day by createdAt ascending', async () => {
    const links = [
      mkLink('later', '2026-09-10', new Date(2026, 8, 10, 12, 0)),
      mkLink('earlier', '2026-09-10', new Date(2026, 8, 10, 9, 0)),
    ]

    subscribeToMonthMock.mockImplementation(
      (_first: string, _last: string, onData: (links: ContentLink[]) => void) => {
        onData(links)
        return () => {}
      },
    )

    const { result } = renderHook(() => useContentLinks(2026, 8))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const day = result.current.byDate['2026-09-10']!
    expect(day[0]!.id).toBe('earlier')
    expect(day[1]!.id).toBe('later')
  })

  it('skips links with a null date (shelved items that leak into a month query)', async () => {
    const links = [
      mkLink('with-date', '2026-09-10'),
      mkLink('no-date', null),
    ]

    subscribeToMonthMock.mockImplementation(
      (_first: string, _last: string, onData: (links: ContentLink[]) => void) => {
        onData(links)
        return () => {}
      },
    )

    const { result } = renderHook(() => useContentLinks(2026, 8))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const keys = Object.keys(result.current.byDate)
    expect(keys).not.toContain('null')
    expect(keys).toContain('2026-09-10')
  })

  it('sets error when the service fires the error callback', async () => {
    subscribeToMonthMock.mockImplementation(
      (_first: string, _last: string, _onData: unknown, onError: (e: Error) => void) => {
        onError(new Error('permission-denied'))
        return () => {}
      },
    )

    const { result } = renderHook(() => useContentLinks(2026, 8))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).not.toBeNull()
    expect(result.current.byDate).toEqual({})
  })

  it('re-subscribes when the month changes', async () => {
    subscribeToMonthMock.mockImplementation(() => () => {})

    const { rerender } = renderHook(
      ({ year, month }: { year: number; month: number }) => useContentLinks(year, month),
      { initialProps: { year: 2026, month: 8 } },
    )

    expect(subscribeToMonthMock).toHaveBeenCalledTimes(1)

    rerender({ year: 2026, month: 9 })

    expect(subscribeToMonthMock).toHaveBeenCalledTimes(2)
  })
})

// ---------------------------------------------------------------------------
// useShelvedLinks — reactive hook (mocked service)
// ---------------------------------------------------------------------------
describe('useShelvedLinks', () => {
  it('starts with isLoading=true and empty shelved array', () => {
    subscribeToShelfMock.mockImplementation(() => () => {})

    const { result } = renderHook(() => useShelvedLinks())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.shelved).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('returns shelved links sorted newest first', async () => {
    const links = [
      mkLink('oldest', null, new Date(2026, 0, 1)),
      mkLink('newest', null, new Date(2026, 5, 15)),
      mkLink('middle', null, new Date(2026, 2, 10)),
    ]

    subscribeToShelfMock.mockImplementation(
      (onData: (links: ContentLink[]) => void) => {
        onData(links)
        return () => {}
      },
    )

    const { result } = renderHook(() => useShelvedLinks())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.shelved[0]!.id).toBe('newest')
    expect(result.current.shelved[1]!.id).toBe('middle')
    expect(result.current.shelved[2]!.id).toBe('oldest')
  })

  it('sets error when the service fires the error callback', async () => {
    subscribeToShelfMock.mockImplementation(
      (_onData: unknown, onError: (e: Error) => void) => {
        onError(new Error('network-error'))
        return () => {}
      },
    )

    const { result } = renderHook(() => useShelvedLinks())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).not.toBeNull()
    expect(result.current.shelved).toEqual([])
  })
})
