// What the website's map draws at each zoom — ADR-031 items 16–18. Mirrors the
// app's marker pipeline (MapboxMarkerPipelineController + ListingClusterIndex):
// far out (below DOTS_BELOW_ZOOM) one small dot per listing; closer in style-A
// pins, with "N aquí" groups where pins would overlap. Boosted listings are held
// out of everything (always their own photo pin, at every zoom); the selected
// listing always shows on its own.
import Supercluster from 'supercluster'
import { showsDots } from './zoomPolicy'
import { mapPointOf, type Bounds } from './mapPoint'
import type { ListingWithProperty } from '@/types/explore'

/** The widest and tallest a style-A pin gets (app: MapMarkerPainter
 *  pinMaxWidthPx / pinMaxHeightPx, measured on the simulator). */
export const PIN_MAX_WIDTH_PX = 176
export const PIN_MAX_HEIGHT_PX = 52

/** Same as the app (ListingClusterIndex, ADR-031 item 17): the radius is the
 *  pin's diagonal, so two un-grouped pins can never touch; grouping stops at 18
 *  (about one block), so a group can always be opened. */
export const CLUSTER_RADIUS_PX = 184
export const CLUSTER_MAX_ZOOM = 18

export type MapMarker =
  | { kind: 'pin'; item: ListingWithProperty; lat: number; lng: number }
  | { kind: 'group'; id: number; count: number; lat: number; lng: number; expansionZoom: number; members: { lat: number; lng: number }[] }
  | { kind: 'dot'; item: ListingWithProperty; lat: number; lng: number }

interface PointProps { index: number }

export class MapMarkerIndex {
  private readonly regular: ListingWithProperty[]
  private readonly boosted: ListingWithProperty[]
  private readonly cluster: Supercluster<PointProps> | null

  constructor(items: ListingWithProperty[]) {
    this.boosted = items.filter((i) => i.listing.isBoosted)
    this.regular = items.filter((i) => !i.listing.isBoosted)
    this.cluster = this.regular.length
      ? new Supercluster<PointProps>({ radius: CLUSTER_RADIUS_PX, maxZoom: CLUSTER_MAX_ZOOM }).load(
          this.regular.map((item, index) => {
            const p = mapPointOf(item)
            return { type: 'Feature', properties: { index }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } }
          }),
        )
      : null
  }

  markersFor(bounds: Bounds, zoom: number, selectedId: string | null): MapMarker[] {
    const inView = (lat: number, lng: number) =>
      lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east
    if (showsDots(zoom)) {
      const out: MapMarker[] = []
      for (const item of this.regular) {
        const p = mapPointOf(item)
        if (inView(p.lat, p.lng)) out.push({ kind: 'dot', item, lat: p.lat, lng: p.lng })
      }
      // Boosted listings are dots too, the same size; the dot draws their gold edge.
      for (const item of this.boosted) {
        const p = mapPointOf(item)
        if (inView(p.lat, p.lng)) out.push({ kind: 'dot', item, lat: p.lat, lng: p.lng })
      }
      return out
    }
    const out: MapMarker[] = []
    if (this.cluster) {
      const z = Math.floor(zoom)
      for (const f of this.cluster.getClusters([bounds.west, bounds.south, bounds.east, bounds.north], z)) {
        const [lng, lat] = f.geometry.coordinates as [number, number]
        const props = f.properties as Partial<Supercluster.ClusterProperties> & Partial<PointProps>
        if (props.cluster) {
          const leaves = this.cluster
            .getLeaves(props.cluster_id!, Infinity)
            .map((l) => this.regular[(l.properties as PointProps).index]!)
          const selected = leaves.find((i) => i.listing.id === selectedId)
          const count = leaves.length - (selected ? 1 : 0)
          if (selected) {
            const p = mapPointOf(selected)
            out.push({ kind: 'pin', item: selected, lat: p.lat, lng: p.lng })
          }
          if (count === 1) {
            const only = leaves.find((i) => i !== selected)!
            const p = mapPointOf(only)
            out.push({ kind: 'pin', item: only, lat: p.lat, lng: p.lng })
          } else if (count > 1) {
            out.push({
              kind: 'group', id: props.cluster_id!, count, lat, lng,
              expansionZoom: this.cluster.getClusterExpansionZoom(props.cluster_id!),
              members: leaves.filter((i) => i !== selected).map(mapPointOf),
            })
          }
        } else {
          const item = this.regular[props.index!]!
          out.push({ kind: 'pin', item, lat, lng })
        }
      }
    }
    for (const item of this.boosted) {
      const p = mapPointOf(item)
      if (inView(p.lat, p.lng)) out.push({ kind: 'pin', item, lat: p.lat, lng: p.lng })
    }
    return out
  }
}
