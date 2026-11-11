import { describe, it, expect } from 'vitest'
import { daysBetween, focusListingId, funnelSteps, medianDays, portfolioRows, sparkFor, trendSeries } from '../selectors'
import type { OwnerAnalytics, OwnerListing, Series } from '../types'

function listing(id: string, over: Partial<OwnerListing> = {}): OwnerListing {
  return {
    id, name: `Casa ${id}`, sub: 'Venta', propertyType: 'casa', operationType: 'venta', status: 'active',
    district: 'Piura', publishedDay: '2026-11-01', daysPublished: 10, photoCount: 6, photoKey: null, saves: 0,
    totals: { '7': { shown: 0, seen: 0, contacts: 0 }, '30': { shown: 0, seen: 0, contacts: 0 }, '90': { shown: 0, seen: 0, contacts: 0 } },
    seen: [], note: { kind: 'ok' }, ...over,
  }
}

// 5–19 Nov: 15 days.
const series: Series = {
  start: '2026-11-05',
  shown: Array.from({ length: 15 }, (_, k) => k + 1),
  seen: Array.from({ length: 15 }, (_, k) => k),
  contacts: Array(15).fill(0),
}

describe('Analítica selectors (ADR-058)', () => {
  it('days are inclusive and cross month ends', () => {
    expect(daysBetween('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
    expect(daysBetween('2026-11-02', '2026-11-01')).toEqual([])
  })

  it('the trend is the series sliced to the period — nothing before counting began', () => {
    const t = trendSeries(series, { from: '2026-11-13', to: '2026-11-19' })
    expect(t).toHaveLength(7)
    expect(t[0]).toEqual({ day: '2026-11-13', shown: 9, seen: 8 })
    expect(t[6]).toEqual({ day: '2026-11-19', shown: 15, seen: 14 })
    // A 30-day period starting 21 Oct: only the counted days appear.
    expect(trendSeries(series, { from: '2026-11-05', to: '2026-11-19' })).toHaveLength(15)
  })

  it('a listing\'s sparkline uses the same days', () => {
    const l = listing('A', { seen: Array.from({ length: 15 }, (_, k) => k * 2) })
    expect(sparkFor(l, series, { from: '2026-11-17', to: '2026-11-19' })).toEqual([24, 26, 28])
  })

  it('funnel percentages: saves and contacts against vistas, WhatsApp against contacts; none when the base is 0', () => {
    expect(funnelSteps({ shown: 1000, seen: 100, saved: 10, contacts: 4, whatsapp: 3 }).map((s) => s.ofPrevious)).toEqual([null, 10, 10, 4, 75])
    const zero = funnelSteps({ shown: 0, seen: 0, saved: 0, contacts: 0, whatsapp: null })
    expect(zero.map((s) => s.ofPrevious)).toEqual([null, null, null, null, null])
    expect(zero[4]?.value).toBeNull()
  })

  it('Tu cartera uses the server totals for the period and sorts by vistas', () => {
    const data = {
      series,
      listings: [
        listing('A', { totals: { '7': { shown: 10, seen: 1, contacts: 1 }, '30': { shown: 99, seen: 99, contacts: 0 }, '90': { shown: 0, seen: 0, contacts: 0 } } }),
        listing('B', { totals: { '7': { shown: 5, seen: 4, contacts: 0 }, '30': { shown: 0, seen: 0, contacts: 0 }, '90': { shown: 0, seen: 0, contacts: 0 } } }),
      ],
    } as unknown as OwnerAnalytics
    const rows = portfolioRows(data, '7', { from: '2026-11-13', to: '2026-11-19' })
    expect(rows.map((r) => r.listing.id)).toEqual(['B', 'A'])
    expect(rows[1]).toMatchObject({ shown: 10, seen: 1, contacts: 1 })
  })

  it('the listing in focus: the one picked, else the most opened, else the first', () => {
    const data = { listings: [listing('A'), listing('B')], featuredListingId: 'B' } as unknown as OwnerAnalytics
    expect(focusListingId(data, 'A')).toBe('A')
    expect(focusListingId(data, 'all')).toBe('B')
    expect(focusListingId(data, 'gone')).toBe('B')
    expect(focusListingId({ ...data, featuredListingId: null } as OwnerAnalytics, 'all')).toBe('A')
  })

  it('median days published ignores closed listings (null days)', () => {
    expect(medianDays([listing('A', { daysPublished: 10 }), listing('B', { daysPublished: 20 }), listing('C', { daysPublished: null })])).toBe(15)
    expect(medianDays([listing('C', { daysPublished: null })])).toBeNull()
  })
})
