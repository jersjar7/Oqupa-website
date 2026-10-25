// What the website's map draws at each zoom — map plan steps 2 and 4 (ADR-031).
// Mirrors the app's marker pipeline (MapboxMarkerPipelineController +
// ListingClusterIndex): only two views — one card per district when zoomed out
// (below DISTRICT_CARDS_BELOW_ZOOM), listing pins and word groups closer in.
// Boosted listings are held out of grouping (always their own pin); the
// selected listing always shows on its own.
import Supercluster from 'supercluster'
import { groupByDistrict, type DistrictGroup, type DistrictLookup } from './districtGroups'
import { showsDistrictCards } from './zoomPolicy'
import { mapPointOf, type Bounds } from './mapPoint'
import type { ListingWithProperty } from '@/types/explore'

/** Same as the app (ListingClusterIndex, tuned 2026-08-23). */
export const CLUSTER_RADIUS_PX = 20
export const CLUSTER_MAX_ZOOM = 15

export type MapMarker =
  | { kind: 'pin'; item: ListingWithProperty; lat: number; lng: number }
  | { kind: 'group'; id: number; count: number; lat: number; lng: number; expansionZoom: number }
  | { kind: 'district'; group: DistrictGroup }

interface PointProps { index: number }

export class MapMarkerIndex {
  private readonly regular: ListingWithProperty[]
  private readonly boosted: ListingWithProperty[]
  private readonly cluster: Supercluster<PointProps> | null

  constructor(private readonly items: ListingWithProperty[], private readonly districtAt?: DistrictLookup) {
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

  private districtGroups: DistrictGroup[] | null = null

  markersFor(bounds: Bounds, zoom: number, selectedId: string | null): MapMarker[] {
    if (showsDistrictCards(zoom)) {
      this.districtGroups ??= groupByDistrict(this.items, this.districtAt)
      return this.districtGroups.map((group) => ({ kind: 'district', group }))
    }
    const inView = (lat: number, lng: number) =>
      lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east
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
