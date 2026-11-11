// ADR-058 R6 — "Qué buscan en tu zona": when the map settles, the website tells
// the server one search: Venta or Alquiler, the price filter in soles, and the
// districts of the listings on screen. A wide look over more than 6 districts is
// not a search of any of them and is not sent. The server adds it up per
// district per day and keeps nothing about the person.

import { useEffect, useRef } from 'react'
import { districtCodeOf } from '@/lib/districtCodes'

interface Filters {
  operationType: string | null
  priceMin: number | null
  priceMax: number | null
  priceCurrency: 'USD' | 'PEN'
}
interface Item {
  property?: { location?: { distrito?: string | null } | null } | null
}

export const FOCUSED_DISTRICTS = 6
const SETTLE_MS = 2500
const SAME_SEARCH_MS = 10 * 60 * 1000

export interface MapSearch {
  side: 'venta' | 'alquiler'
  priceMin: number | null
  priceMax: number | null
  districts: string[]
}

/** The search the map shows right now, or null when it is not a focused one. */
export function searchFrom(filters: Filters, visible: Item[], penPerUsd: number): MapSearch | null {
  const side = filters.operationType === 'alquiler' ? 'alquiler' : filters.operationType === 'venta' ? 'venta' : null
  if (!side) return null
  const codes = [...new Set(visible.map((i) => districtCodeOf(i.property?.location?.distrito)).filter((c): c is string => !!c))].sort()
  if (codes.length === 0 || codes.length > FOCUSED_DISTRICTS) return null
  const soles = (v: number | null) => (v === null ? null : Math.round(filters.priceCurrency === 'USD' ? v * penPerUsd : v))
  return { side, priceMin: soles(filters.priceMin), priceMax: soles(filters.priceMax), districts: codes }
}

const lastSent = new Map<string, number>()

export function useMapSearchReport(
  filters: Filters,
  visible: Item[],
  penPerUsd: number,
  send: (s: MapSearch) => Promise<void>,
  now: () => number = Date.now,
) {
  const sendRef = useRef(send)
  sendRef.current = send
  const search = searchFrom(filters, visible, penPerUsd)
  const key = search ? JSON.stringify(search) : ''
  useEffect(() => {
    if (!search) return
    const timer = setTimeout(() => {
      const t = now()
      const last = lastSent.get(key)
      if (last !== undefined && t - last < SAME_SEARCH_MS) return
      lastSent.set(key, t)
      sendRef.current(search).catch(() => undefined)
    }, SETTLE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

/** For tests. */
export function resetMapSearchReport() {
  lastSent.clear()
}
