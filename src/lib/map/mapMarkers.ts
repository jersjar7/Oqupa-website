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
// Since ADR-048 every selected listing is drawn that way, at any zoom.
import { showsDots } from './zoomPolicy'
import { mapPointOf, type Bounds } from './mapPoint'
import type { ListingWithProperty } from '@/types/explore'
import { isBoostLive } from '@/lib/boostState'

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
    this.boosted = items.filter((i) => isBoostLive(i.listing))
    this.regular = items.filter((i) => !isBoostLive(i.listing))
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
    // Every selected listing shows its pin raised on its leader line, at any
    // zoom, however it was opened (ADR-048, Jerson 2026-11-02). A tapped dot
    // is raised as it is opened (ADR-036); a dot raised but not open drops
    // once pins show, as every listing is then a pin.
    const dots = showsDots(zoom)
    const liftedId = selectedId ?? (dots ? raisedId : null)
    const out: MapMarker[] = []
    let lifted: { item: ListingWithProperty; lat: number; lng: number } | null = null
    if (dots) {
      // Boosted listings are dots too, the same size; the dot draws their gold edge.
      // One pointed at in the list shows as its pin even far out, drawn after the dots.
      const pins: MapMarker[] = []
      for (const item of [...this.regular, ...this.boosted]) {
        const p = mapPointOf(item)
        if (!inView(p.lat, p.lng)) continue
        if (item.listing.id === liftedId) {
          // Its dot becomes the small black dot at its line's foot.
          out.push({ kind: 'anchor', item, lat: p.lat, lng: p.lng })
          lifted = { item, lat: p.lat, lng: p.lng }
        } else if (item.listing.id === emphasizedId) pins.push({ kind: 'pin', item, lat: p.lat, lng: p.lng })
        else out.push({ kind: 'dot', item, lat: p.lat, lng: p.lng })
      }
      if (lifted) out.push({ kind: 'raised', ...lifted })
      return [...out, ...pins]
    }
    for (const spot of this.spots) {
      if (!inView(spot.lat, spot.lng)) continue
      const selected = spot.items.find((i) => i.listing.id === liftedId)
      if (selected) lifted = { item: selected, lat: spot.lat, lng: spot.lng }
      const rest = spot.items.filter((i) => i !== selected)
      if (rest.length === 1) {
        out.push({ kind: 'pin', item: rest[0]!, lat: spot.lat, lng: spot.lng })
      } else if (rest.length > 1) {
        out.push({ kind: 'group', id: `spot:${spot.lat},${spot.lng}`, count: rest.length, lat: spot.lat, lng: spot.lng, items: rest })
      }
    }
    for (const item of this.boosted) {
      const p = mapPointOf(item)
      if (!inView(p.lat, p.lng)) continue
      if (item.listing.id === liftedId) lifted = { item, lat: p.lat, lng: p.lng }
      else out.push({ kind: 'pin', item, lat: p.lat, lng: p.lng })
    }
    // Last, so it sits on top: the small black dot on the exact spot, then
    // the pin on its line above it.
    if (lifted) out.push({ kind: 'anchor', ...lifted }, { kind: 'raised', ...lifted })
    return out
  }
}
