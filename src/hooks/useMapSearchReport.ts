// ADR-058 R6 — "Qué buscan en tu zona": when the map settles, the website tells
// the server one search: Venta or Alquiler, the price filter in soles, and nine
// points of the screen — the server finds the districts under them, whether or
// not anything is published there (break-it web 4 #2, round 9 #2). A view wider
// than about 20 km is not a search. At most
// one search per device every 10 minutes leaves the browser (web 4 #3); the
// server adds it up per district per day and keeps nothing about the person.

import { useEffect, useRef } from 'react'

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
  /** A 4×4 grid of the screen; the server finds the districts under them (round 9 #2). */
  points: Array<{ lat: number; lng: number }>
}

/** A view wider than about 20 km is a look around, not a search of a place. */
export const MAX_SPAN_DEGREES = 0.2

/** The search the map shows right now, or null when it is not a focused one. */
export function searchFrom(filters: Filters, bounds: ViewBounds | null, penPerUsd: number): MapSearch | null {
  const side = filters.operationType === 'alquiler' ? 'alquiler' : filters.operationType === 'venta' ? 'venta' : null
  if (!side || !bounds) return null
  if (bounds.north - bounds.south > MAX_SPAN_DEGREES || bounds.east - bounds.west > MAX_SPAN_DEGREES) return null
  const points: MapSearch['points'] = []
  for (const fy of [0.125, 0.375, 0.625, 0.875]) {
    for (const fx of [0.125, 0.375, 0.625, 0.875]) {
      points.push({
        lat: Math.round((bounds.south + (bounds.north - bounds.south) * fy) * 1000) / 1000,
        lng: Math.round((bounds.west + (bounds.east - bounds.west) * fx) * 1000) / 1000,
      })
    }
  }
  const soles = (v: number | null) => (v === null ? null : Math.round(filters.priceCurrency === 'USD' ? v * penPerUsd : v))
  return { side, priceMin: soles(filters.priceMin), priceMax: soles(filters.priceMax), points }
}

const GAP_KEY = 'oqupa_search_sent_at_v1'
let lastSentAt: number | null = null
function readLast(): number | null {
  if (lastSentAt !== null) return lastSentAt
  try {
    const v = Number(sessionStorage.getItem(GAP_KEY))
    return Number.isFinite(v) && v > 0 ? v : null
  } catch {
    return null
  }
}
function writeLast(t: number) {
  lastSentAt = t
  try { sessionStorage.setItem(GAP_KEY, String(t)) } catch { /* fine */ }
}

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
      const last = readLast()
      if (last !== null && t - last < GAP_MS) return
      // The gap starts only once a search has left (web 6 #3).
      sendRef.current(search).then(() => writeLast(t)).catch(() => undefined)
    }, SETTLE_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
}

/** For tests. */
export function resetMapSearchReport() {
  lastSentAt = null
  try { sessionStorage.removeItem(GAP_KEY) } catch { /* fine */ }
}
