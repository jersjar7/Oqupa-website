// ADR-058 R6 — "Qué buscan en tu zona": when the map settles, the website tells
// the server one search: Venta or Alquiler, the price filter in soles, and the
// districts the map is looking at — whether or not anything is published there
// (break-it web 4 #2: demand where there is no supply is the telling part). A
// wide look over more than 6 districts is not a search of any of them. At most
// one search per device every 10 minutes leaves the browser (web 4 #3); the
// server adds it up per district per day and keeps nothing about the person.

import { useEffect, useRef } from 'react'
import { districtsInView } from '@/lib/districtBoxes'

interface Filters {
  operationType: string | null
  priceMin: number | null
  priceMax: number | null
  priceCurrency: 'USD' | 'PEN'
}
export interface ViewBounds { south: number; west: number; north: number; east: number }

export const FOCUSED_DISTRICTS = 6
const SETTLE_MS = 2500
const GAP_MS = 10 * 60 * 1000

export interface MapSearch {
  side: 'venta' | 'alquiler'
  priceMin: number | null
  priceMax: number | null
  districts: string[]
}

/** The search the map shows right now, or null when it is not a focused one. */
export function searchFrom(filters: Filters, bounds: ViewBounds | null, penPerUsd: number): MapSearch | null {
  const side = filters.operationType === 'alquiler' ? 'alquiler' : filters.operationType === 'venta' ? 'venta' : null
  if (!side || !bounds) return null
  const codes = districtsInView(bounds).sort()
  if (codes.length === 0 || codes.length > FOCUSED_DISTRICTS) return null
  const soles = (v: number | null) => (v === null ? null : Math.round(filters.priceCurrency === 'USD' ? v * penPerUsd : v))
  return { side, priceMin: soles(filters.priceMin), priceMax: soles(filters.priceMax), districts: codes }
}

let lastSentAt: number | null = null

export function useMapSearchReport(
  filters: Filters,
  bounds: ViewBounds | null,
  penPerUsd: number,
  send: (s: MapSearch) => Promise<void>,
  now: () => number = Date.now,
) {
  const sendRef = useRef(send)
  sendRef.current = send
  const search = searchFrom(filters, bounds, penPerUsd)
  const key = search ? JSON.stringify(search) : ''
  useEffect(() => {
    if (!search) return
    const timer = setTimeout(() => {
      const t = now()
      if (lastSentAt !== null && t - lastSentAt < GAP_MS) return
      lastSentAt = t
      sendRef.current(search).catch(() => undefined)
    }, SETTLE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

/** For tests. */
export function resetMapSearchReport() {
  lastSentAt = null
}
