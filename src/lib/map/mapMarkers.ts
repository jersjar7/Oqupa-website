// What the website's map draws at each zoom — ADR-031 item 16 and ADR-032.
// Mirrors the app's marker pipeline (MapboxMarkerPipelineController +
// ListingClusterIndex): far out (below DOTS_BELOW_ZOOM) one small dot per
// listing; closer in one style-A pin per listing, overlapping freely, like
// Redfin and Zillow (Jerson, 2026-10-25: no groups). The one exception is
// listings at the IDENTICAL point (several units in one building): one pin
// would hide the other completely, so they share one "N aquí" pin. Boosted
// listings are never part of it (always their own photo pin, drawn last so
// they sit on top); the selected listing always shows on its own. A tapped
// dot raises its pin on a leader line (ADR-033): its dot becomes a small black
// dot at the line's foot and the raised pin is drawn last, over every dot.
import { showsDots } from './zoomPolicy'
import { mapPointOf, type Bounds } from './mapPoint'
import type { ListingWithProperty } from '@/types/explore'

export type MapMarker =
  | { kind: 'pin'; item: ListingWithProperty; lat: number; lng: number }
  | { kind: 'group'; id: string; count: number; lat: number; lng: number; items: ListingWithProperty[] }
  | { kind: 'dot'; item: ListingWithProperty; lat: number; lng: number }
  | { kind: 'raised'; item: ListingWithProperty; lat: number; lng: number }
  | { kind: 'anchor'; item: ListingWithProperty; lat: number; lng: number }

export class MapMarkerIndex {
  private readonly regular: ListingWithProperty[]
  private readonly boosted: ListingWithProperty[]
  /** Regular listings bucketed by their exact point. */
  private readonly spots: { lat: number; lng: number; items: ListingWithProperty[] }[]

  constructor(items: ListingWithProperty[]) {
    this.boosted = items.filter((i) => i.listing.isBoosted)
    this.regular = items.filter((i) => !i.listing.isBoosted)
    const byPoint = new Map<string, { lat: number; lng: number; items: ListingWithProperty[] }>()
    for (const item of this.regular) {
      const p = mapPointOf(item)
      const key = `${p.lat},${p.lng}`
      const spot = byPoint.get(key)
      if (spot) spot.items.push(item)
      else byPoint.set(key, { lat: p.lat, lng: p.lng, items: [item] })
    }
    this.spots = [...byPoint.values()]
  }

  /** `emphasizedId`: a listing pointed at in the list beside the map — far
   *  out it shows as its pin, like the selected one, so it can be found. */
  markersFor(
    bounds: Bounds,
    zoom: number,
    selectedId: string | null,
    raisedId: string | null = null,
    emphasizedId: string | null = null,
  ): MapMarker[] {
    const inView = (lat: number, lng: number) =>
      lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east
    if (showsDots(zoom)) {
      const out: MapMarker[] = []
      // Boosted listings are dots too, the same size; the dot draws their gold edge.
      // The selected listing, and one pointed at in the list, show as their
      // pins even far out (as in the app), drawn after the dots.
      const shownAsPin = new Set([selectedId, emphasizedId].filter((id): id is string => !!id))
      const pins: MapMarker[] = []
      for (const item of [...this.regular, ...this.boosted]) {
        const p = mapPointOf(item)
        if (!inView(p.lat, p.lng)) continue
        if (shownAsPin.has(item.listing.id)) pins.push({ kind: 'pin', item, lat: p.lat, lng: p.lng })
        else out.push({ kind: 'dot', item, lat: p.lat, lng: p.lng })
      }
      // A raised listing's dot becomes the small black dot at its line's foot.
      const at = out.findIndex((m) => m.kind === 'dot' && m.item.listing.id === raisedId)
      const raised = out[at]
      if (raised && raised.kind === 'dot') {
        out[at] = { kind: 'anchor', item: raised.item, lat: raised.lat, lng: raised.lng }
        out.push({ kind: 'raised', item: raised.item, lat: raised.lat, lng: raised.lng })
      }
      return [...out, ...pins]
    }
    const out: MapMarker[] = []
    for (const spot of this.spots) {
      if (!inView(spot.lat, spot.lng)) continue
      const selected = spot.items.find((i) => i.listing.id === selectedId)
      if (selected) out.push({ kind: 'pin', item: selected, lat: spot.lat, lng: spot.lng })
      const rest = spot.items.filter((i) => i !== selected)
      if (rest.length === 1) {
        out.push({ kind: 'pin', item: rest[0]!, lat: spot.lat, lng: spot.lng })
      } else if (rest.length > 1) {
        out.push({ kind: 'group', id: `spot:${spot.lat},${spot.lng}`, count: rest.length, lat: spot.lat, lng: spot.lng, items: rest })
      }
    }
    for (const item of this.boosted) {
      const p = mapPointOf(item)
      if (inView(p.lat, p.lng)) out.push({ kind: 'pin', item, lat: p.lat, lng: p.lng })
    }
    return out
  }
}
