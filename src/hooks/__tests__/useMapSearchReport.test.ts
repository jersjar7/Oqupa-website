// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { resetMapSearchReport, searchFrom, useMapSearchReport } from '../useMapSearchReport'

const filters = (over = {}) => ({ operationType: 'alquiler', priceMin: 800, priceMax: 1200, priceCurrency: 'PEN' as const, ...over })
// A small box around Castilla's centre.
const castilla = { south: -5.21, west: -80.625, north: -5.19, east: -80.615 }
// Most of the departamento.
const wide = { south: -6.5, west: -81.4, north: -4.0, east: -79.2 }

describe('searchFrom (ADR-058 R6)', () => {
  it('the side, the price in soles and a 3×3 grid of the view (the server finds the districts)', () => {
    const s = searchFrom(filters(), castilla, 3.44)
    expect(s?.side).toBe('alquiler')
    expect(s?.points).toHaveLength(9)
    expect(s?.points.every((p) => p.lat <= castilla.north && p.lat >= castilla.south)).toBe(true)
    expect(s?.priceMin).toBe(800)
  })

  it('dollars become soles', () => {
    expect(searchFrom(filters({ operationType: 'venta', priceMin: 100000, priceMax: null, priceCurrency: 'USD' }), castilla, 3.44))
      .toMatchObject({ side: 'venta', priceMin: 344000, priceMax: null })
  })

  it('a view wider than about 20 km, or no bounds yet, is not a search', () => {
    expect(searchFrom(filters(), wide, 3.44)).toBeNull()
    expect(searchFrom(filters(), null, 3.44)).toBeNull()
  })
})

describe('useMapSearchReport', () => {
  beforeEach(() => { vi.useFakeTimers(); resetMapSearchReport() })
  afterEach(() => vi.useRealTimers())

  it('sends once the map settles, then nothing more for 10 minutes on this device (web 4 #3)', () => {
    let t = 0
    const send = vi.fn(async () => undefined)
    const { rerender } = renderHook(({ min }) => useMapSearchReport(filters({ priceMin: min }), castilla, 3.44, send, () => t), { initialProps: { min: 800 } })
    vi.advanceTimersByTime(2600)
    expect(send).toHaveBeenCalledTimes(1)
    t = 5 * 60 * 1000
    rerender({ min: 900 })
    vi.advanceTimersByTime(2600)
    expect(send).toHaveBeenCalledTimes(1)
    t = 11 * 60 * 1000
    rerender({ min: 1000 })
    vi.advanceTimersByTime(2600)
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('a map that keeps moving sends nothing until it stops', () => {
    const send = vi.fn(async () => undefined)
    const { rerender } = renderHook(({ min }) => useMapSearchReport(filters({ priceMin: min }), castilla, 3.44, send, () => 0), { initialProps: { min: 800 } })
    vi.advanceTimersByTime(1000)
    rerender({ min: 900 })
    vi.advanceTimersByTime(1000)
    expect(send).not.toHaveBeenCalled()
  })
})
