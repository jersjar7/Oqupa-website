// Zoomed far out, one card per district — "Castilla · 22 en venta" (map plan
// step 2, ADR-031). Same rules as the app's MapDistrictGroups:
//  - exact location → the official outline its pin falls in (Google's stored
//    name is wrong for many pins: "Piura" for pins in Castilla);
//  - approximate location → the public point is moved up to 350 m and may cross
//    a border, so the stored name, cleaned;
//  - an exact pin outside every outline (the Máncora coast) → the stored name;
//  - nothing matches → "Otros lugares". A listing is never dropped.
import { findDistrict, type PeruDistrict } from './peruGeography'
import { mapPointOf, type Bounds } from './mapPoint'
import type { ListingWithProperty } from '@/types/explore'

export const OTROS_LUGARES = 'Otros lugares'

export type DistrictLookup = (lat: number, lng: number) => PeruDistrict | null

export interface DistrictGroup {
  name: string
  count: number
  centroid: { lat: number; lng: number }
  bounds: Bounds
  listingIds: string[]
}

export function districtNameFor(item: ListingWithProperty, districtAt?: DistrictLookup): string {
  const { listing, property } = item
  if (listing.showExactLocation !== false && districtAt) {
    const fromPin = districtAt(property.location.latitude, property.location.longitude)
    if (fromPin) return fromPin.distrito
  }
  return findDistrict(property.location.distrito, property.location.provincia)?.distrito ?? OTROS_LUGARES
}

/** One group per district, biggest first (ties by name). The centroid is the
 *  middle of the group's MAP points — where the person sees them. */
export function groupByDistrict(items: ListingWithProperty[], districtAt?: DistrictLookup): DistrictGroup[] {
  const byName = new Map<string, ListingWithProperty[]>()
  for (const item of items) {
    const name = districtNameFor(item, districtAt)
    const list = byName.get(name) ?? []
    list.push(item)
    byName.set(name, list)
  }
  return [...byName.entries()]
    .map(([name, list]) => groupOf(name, list))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

function groupOf(name: string, items: ListingWithProperty[]): DistrictGroup {
  let sumLat = 0, sumLng = 0
  let south = Infinity, west = Infinity, north = -Infinity, east = -Infinity
  for (const item of items) {
    const p = mapPointOf(item)
    sumLat += p.lat
    sumLng += p.lng
    south = Math.min(south, p.lat)
    west = Math.min(west, p.lng)
    north = Math.max(north, p.lat)
    east = Math.max(east, p.lng)
  }
  return {
    name,
    count: items.length,
    centroid: { lat: sumLat / items.length, lng: sumLng / items.length },
    bounds: { south, west, north, east },
    listingIds: items.map((i) => i.listing.id),
  }
}

/** The card's second line: "22 en venta" / "4 en alquiler". */
export const districtCountLine = (count: number, isVenta: boolean): string =>
  `${count} en ${isVenta ? 'venta' : 'alquiler'}`

/** Spread cards (screen px, priority order — biggest district first) so no two
 *  overlap: a card that would sit on an earlier one moves straight down below
 *  it, by as little as needed. */
export function spreadPx(
  anchors: { x: number; y: number }[],
  sizes: { w: number; h: number }[],
  gap = 6,
): { x: number; y: number }[] {
  const placed: { x: number; y: number; w: number; h: number }[] = []
  return anchors.map((anchor, i) => {
    const mine = sizes[i]!
    let at = { ...anchor }
    for (let pass = 0; pass <= placed.length; pass++) {
      const hit = placed.find(
        (o) => Math.abs(at.x - o.x) < (mine.w + o.w) / 2 && Math.abs(at.y - o.y) < (mine.h + o.h) / 2 + gap,
      )
      if (!hit) break
      at = { x: at.x, y: hit.y + (hit.h + mine.h) / 2 + gap }
    }
    placed.push({ ...at, w: mine.w, h: mine.h })
    return at
  })
}
