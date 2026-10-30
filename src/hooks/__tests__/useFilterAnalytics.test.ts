// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { MapFilters } from '@/types/explore'

const { filterAppliedMock, searchNoResultsMock } = vi.hoisted(() => ({
  filterAppliedMock: vi.fn(),
  searchNoResultsMock: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  AnalyticsLogger: {
    filterApplied: (...args: unknown[]) => filterAppliedMock(...args),
    searchNoResults: (...args: unknown[]) => searchNoResultsMock(...args),
  },
}))

import { useFilterAnalytics, FILTER_SETTLE_MS } from '@/hooks/useFilterAnalytics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NO_FILTERS: MapFilters = {
  operationType: 'venta',
  rentalDurationType: null,
  propertyTypes: [],
  priceMin: null,
  priceMax: null,
}

interface Props {
  filters: MapFilters
  resultCount: number
  listingsReady: boolean
}

function setup(initial: Partial<Props> = {}) {
  const props: Props = { filters: NO_FILTERS, resultCount: 5, listingsReady: true, ...initial }
  const hook = renderHook((p: Props) => useFilterAnalytics(p.filters, p.resultCount, p.listingsReady), {
    initialProps: props,
  })
  let current = props
  return {
    rerender(next: Partial<Props>) {
      current = { ...current, ...next }
      hook.rerender(current)
    },
  }
}

function settle(ms = FILTER_SETTLE_MS) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function sentParams() {
  return filterAppliedMock.mock.calls[0]![0]
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFilterAnalytics', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    filterAppliedMock.mockReset()
    searchNoResultsMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('settles after 1.5 s', () => {
    expect(FILTER_SETTLE_MS).toBe(1500)
  })

  describe('when it sends', () => {
    it('sends once the filters have been unchanged for 1.5 s', () => {
      const h = setup()
      h.rerender({ filters: { ...NO_FILTERS, propertyTypes: ['casa'] } })
      settle(FILTER_SETTLE_MS - 1)
      expect(filterAppliedMock).not.toHaveBeenCalled()
      settle(1)
      expect(filterAppliedMock).toHaveBeenCalledTimes(1)
    })

    it('restarts the wait on every change (typing a price)', () => {
      const h = setup()
      h.rerender({ filters: { ...NO_FILTERS, priceMax: 1 } })
      settle(1000)
      h.rerender({ filters: { ...NO_FILTERS, priceMax: 15 } })
      settle(1000)
      h.rerender({ filters: { ...NO_FILTERS, priceMax: 1500 } })
      settle(FILTER_SETTLE_MS - 1)
      expect(filterAppliedMock).not.toHaveBeenCalled()
      settle(1)
      expect(filterAppliedMock).toHaveBeenCalledTimes(1)
    })

    it('waits for the listings to finish loading', () => {
      const h = setup({ listingsReady: false })
      h.rerender({ filters: { ...NO_FILTERS, propertyTypes: ['casa'] } })
      settle(10_000)
      expect(filterAppliedMock).not.toHaveBeenCalled()
      h.rerender({ listingsReady: true, resultCount: 7 })
      expect(filterAppliedMock).toHaveBeenCalledTimes(1)
      expect(sentParams().resultCount).toBe(7)
    })

    it('does not send when only the operation type is set', () => {
      const h = setup()
      settle()
      h.rerender({ filters: { ...NO_FILTERS, operationType: 'alquiler' } })
      settle()
      expect(filterAppliedMock).not.toHaveBeenCalled()
      expect(searchNoResultsMock).not.toHaveBeenCalled()
    })

    it('does not send for filters that were set and cleared before settling', () => {
      const h = setup()
      h.rerender({ filters: { ...NO_FILTERS, propertyTypes: ['casa'] } })
      settle(500)
      h.rerender({ filters: NO_FILTERS })
      settle()
      expect(filterAppliedMock).not.toHaveBeenCalled()
    })
  })

  describe('fields', () => {
    it('sends every active kind sorted, with operation, types, duration and count', () => {
      const h = setup()
      h.rerender({
        filters: {
          operationType: 'alquiler',
          rentalDurationType: 'shortTerm',
          propertyTypes: ['terreno', 'casa'],
          priceMin: 500,
          priceMax: null,
        },
        resultCount: 3,
      })
      settle()
      expect(sentParams()).toEqual({
        filterType: 'price,property_type,rental_duration',
        operationType: 'alquiler',
        propertyTypes: ['terreno', 'casa'],
        rentalDuration: 'shortTerm',
        resultCount: 3,
      })
    })

    it.each([
      [{ priceMin: 100 }, 'price'],
      [{ priceMax: 100 }, 'price'],
      [{ priceMin: 0 }, 'price'],
      [{ propertyTypes: ['oficina'] }, 'property_type'],
      [{ rentalDurationType: 'longTerm' as const }, 'rental_duration'],
      [{ propertyTypes: ['casa'], priceMax: 9 }, 'price,property_type'],
    ])('filter_type for %j is %s', (change, filterType) => {
      const h = setup()
      h.rerender({ filters: { ...NO_FILTERS, ...change } })
      settle()
      expect(sentParams().filterType).toBe(filterType)
    })

    it('sends a price filter with no bounds and no currency', () => {
      const h = setup()
      h.rerender({ filters: { ...NO_FILTERS, priceMin: 100, priceMax: 900 } })
      settle()
      const params = sentParams()
      expect(params.filterType).toBe('price')
      for (const key of [
        'minPricePen',
        'maxPricePen',
        'minPriceUsd',
        'maxPriceUsd',
        'priceInputCurrency',
      ]) {
        expect(params).not.toHaveProperty(key)
      }
    })

    it('omits property types and rental duration when not set', () => {
      const h = setup()
      h.rerender({ filters: { ...NO_FILTERS, priceMax: 900 } })
      settle()
      expect(sentParams()).toEqual({
        filterType: 'price',
        operationType: 'venta',
        propertyTypes: null,
        rentalDuration: null,
        resultCount: 5,
      })
    })
  })

  describe('search_no_results', () => {
    it('also sends search_no_results, with the same filter set, when nothing matches', () => {
      const h = setup()
      h.rerender({ filters: { ...NO_FILTERS, propertyTypes: ['hospedaje'] }, resultCount: 0 })
      settle()
      expect(filterAppliedMock).toHaveBeenCalledTimes(1)
      expect(searchNoResultsMock).toHaveBeenCalledTimes(1)
      const { resultCount, ...filterSet } = sentParams()
      expect(resultCount).toBe(0)
      expect(searchNoResultsMock).toHaveBeenCalledWith(filterSet)
    })

    it('is not sent when something matches', () => {
      const h = setup()
      h.rerender({ filters: { ...NO_FILTERS, propertyTypes: ['casa'] }, resultCount: 1 })
      settle()
      expect(searchNoResultsMock).not.toHaveBeenCalled()
    })
  })

  describe('dedupe', () => {
    it('does not resend when the result count changes (panning, refetch)', () => {
      const h = setup()
      h.rerender({ filters: { ...NO_FILTERS, propertyTypes: ['casa'] } })
      settle()
      h.rerender({ resultCount: 9 })
      h.rerender({ listingsReady: false })
      h.rerender({ listingsReady: true, resultCount: 0 })
      settle(10_000)
      expect(filterAppliedMock).toHaveBeenCalledTimes(1)
      expect(searchNoResultsMock).not.toHaveBeenCalled()
    })

    it('does not resend for an equal filter set in a new object', () => {
      const h = setup()
      h.rerender({ filters: { ...NO_FILTERS, propertyTypes: ['casa', 'local'] } })
      settle()
      h.rerender({ filters: { ...NO_FILTERS, propertyTypes: ['local', 'casa'] } })
      settle()
      expect(filterAppliedMock).toHaveBeenCalledTimes(1)
    })

    it('does not resend after a brief change that went back before settling', () => {
      const h = setup()
      const casa = { ...NO_FILTERS, propertyTypes: ['casa'] }
      h.rerender({ filters: casa })
      settle()
      h.rerender({ filters: { ...casa, priceMax: 5 } })
      settle(500)
      h.rerender({ filters: { ...casa } })
      settle()
      expect(filterAppliedMock).toHaveBeenCalledTimes(1)
    })

    it('sends again for a different settled filter set', () => {
      const h = setup()
      h.rerender({ filters: { ...NO_FILTERS, propertyTypes: ['casa'] } })
      settle()
      h.rerender({ filters: { ...NO_FILTERS, propertyTypes: ['casa'], priceMax: 900 } })
      settle()
      expect(filterAppliedMock).toHaveBeenCalledTimes(2)
    })

    it('sends again when only the price bound changes', () => {
      const h = setup()
      h.rerender({ filters: { ...NO_FILTERS, priceMax: 900 } })
      settle()
      h.rerender({ filters: { ...NO_FILTERS, priceMax: 1200 } })
      settle()
      expect(filterAppliedMock).toHaveBeenCalledTimes(2)
    })

    it('sends again when the operation type changes with filters kept', () => {
      const h = setup()
      h.rerender({ filters: { ...NO_FILTERS, priceMax: 900 } })
      settle()
      h.rerender({ filters: { ...NO_FILTERS, priceMax: 900, operationType: 'alquiler' }, listingsReady: false })
      settle()
      expect(filterAppliedMock).toHaveBeenCalledTimes(1)
      h.rerender({ listingsReady: true })
      expect(filterAppliedMock).toHaveBeenCalledTimes(2)
      expect(filterAppliedMock.mock.calls[1]![0].operationType).toBe('alquiler')
    })

    it('sends the same set again after the filters were cleared and settled in between', () => {
      const h = setup()
      const casa = { ...NO_FILTERS, propertyTypes: ['casa'] }
      h.rerender({ filters: casa })
      settle()
      h.rerender({ filters: NO_FILTERS })
      settle()
      h.rerender({ filters: { ...casa } })
      settle()
      expect(filterAppliedMock).toHaveBeenCalledTimes(2)
    })
  })

  describe('failures', () => {
    it('swallows an analytics error so the page keeps working', () => {
      filterAppliedMock.mockImplementation(() => {
        throw new Error('analytics down')
      })
      const h = setup()
      h.rerender({ filters: { ...NO_FILTERS, propertyTypes: ['casa'] } })
      expect(() => settle()).not.toThrow()
    })

    it('does not retry a set whose send threw', () => {
      filterAppliedMock.mockImplementationOnce(() => {
        throw new Error('analytics down')
      })
      const h = setup()
      h.rerender({ filters: { ...NO_FILTERS, propertyTypes: ['casa'] } })
      settle()
      h.rerender({ resultCount: 2 })
      expect(filterAppliedMock).toHaveBeenCalledTimes(1)
    })

    it('clears its timer on unmount', () => {
      const { unmount } = renderHook(() =>
        useFilterAnalytics({ ...NO_FILTERS, propertyTypes: ['casa'] }, 1, true),
      )
      unmount()
      settle()
      expect(filterAppliedMock).not.toHaveBeenCalled()
    })
  })
})
