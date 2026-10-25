// Which official district a point is in — map plan step 1 (ADR-031).
//
// Google's address lookup is NOT trusted for the district: measured 2026-10-24,
// it answers "Piura" (the city) for pins in Castilla and in Veintiséis de
// Octubre, and a village name ("Chato") elsewhere. The pin is checked against
// the official outlines instead — public/boundaries/distritos_piura.geojson,
// IGN Perú via OCHA HDX, CC BY-IGO (credited in Términos). The same file and the
// same rules as the app's DistrictResolver.
import { findDistrict, type PeruDistrict } from './peruGeography'

type Ring = [number, number][] // [lng, lat]
interface Outline { district: PeruDistrict; outer: Ring; holes: Ring[] }

interface GeoFeature {
  type?: string
  properties?: Record<string, unknown> | null
  geometry?: { type: string; coordinates: unknown } | null
}
export interface DistrictGeoJson { type?: string; features?: GeoFeature[] }

export const DISTRICT_OUTLINES_URL = '/boundaries/distritos_piura.geojson'

export class DistrictResolver {
  private constructor(
    private readonly outlines: Outline[],
    /** Outline names that matched no official district (empty for the real file). */
    readonly unmatchedOutlineNames: string[],
  ) {}

  static fromGeoJson(geojson: DistrictGeoJson): DistrictResolver {
    const outlines: Outline[] = []
    const unmatched: string[] = []
    for (const f of geojson.features ?? []) {
      const props = f.properties ?? {}
      const name = typeof props.distrito === 'string' ? props.distrito : undefined
      const prov = typeof props.provincia === 'string' ? props.provincia : undefined
      const district = findDistrict(name, prov)
      if (!district) {
        unmatched.push(name ?? '(sin nombre)')
        continue
      }
      for (const poly of polygonsOf(f.geometry)) {
        outlines.push({ district, outer: poly[0]!, holes: poly.slice(1) })
      }
    }
    return new DistrictResolver(outlines, unmatched)
  }

  private static cached: Promise<DistrictResolver> | null = null

  /** The bundled outlines, fetched and parsed once per page load. */
  static load(fetchImpl: typeof fetch = fetch): Promise<DistrictResolver> {
    DistrictResolver.cached ??= fetchImpl(DISTRICT_OUTLINES_URL)
      .then((r) => r.json() as Promise<DistrictGeoJson>)
      .then((g) => DistrictResolver.fromGeoJson(g))
      .catch((e) => {
        DistrictResolver.cached = null
        throw e
      })
    return DistrictResolver.cached
  }

  outlineCountFor(district: PeruDistrict): number {
    return this.outlines.filter((o) => o.district === district).length
  }

  /** The official district whose outline contains the point, or null. */
  districtAt(lat: number, lng: number): PeruDistrict | null {
    for (const o of this.outlines) {
      if (inRing(o.outer, lat, lng) && !o.holes.some((h) => inRing(h, lat, lng))) return o.district
    }
    return null
  }

  /** The district to save for a pin: its outline; only outside every outline,
   *  Google's name if official; otherwise null and the owner chooses. */
  districtForPin(lat: number, lng: number, googleDistrito?: string | null, googleProvincia?: string | null): PeruDistrict | null {
    return this.districtAt(lat, lng) ?? findDistrict(googleDistrito, googleProvincia)
  }
}

function polygonsOf(geometry: GeoFeature['geometry']): Ring[][] {
  if (!geometry) return []
  if (geometry.type === 'Polygon') return [geometry.coordinates as Ring[]]
  if (geometry.type === 'MultiPolygon') return geometry.coordinates as Ring[][]
  return []
}

/** Ray casting (even-odd rule). Rings are [lng, lat] pairs. */
function inRing(ring: Ring, lat: number, lng: number): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i]!
    const [bx, by] = ring[j]!
    if (ay > lat !== by > lat && lng < ((bx - ax) * (lat - ay)) / (by - ay) + ax) inside = !inside
  }
  return inside
}
