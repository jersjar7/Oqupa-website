// The departamento de Piura's outer border, for the location picker: a pin
// outside it is refused. Same file the map draws (BOUNDARY_LAYERS). Replaces
// the Google geometry check the picker used before Mapbox (map plan step 4).
import { BOUNDARY_LAYERS } from '@/lib/constants'

type Ring = [number, number][]
interface Feature { geometry?: { type: string; coordinates: unknown } | null }

export class DepartamentoBorder {
  private constructor(private readonly polygons: Ring[][]) {}

  static fromGeoJson(geojson: { features?: Feature[] }): DepartamentoBorder {
    const polygons: Ring[][] = []
    for (const f of geojson.features ?? []) {
      const g = f.geometry
      if (g?.type === 'Polygon') polygons.push(g.coordinates as Ring[])
      else if (g?.type === 'MultiPolygon') polygons.push(...(g.coordinates as Ring[][]))
    }
    return new DepartamentoBorder(polygons)
  }

  private static cached: Promise<DepartamentoBorder> | null = null

  static load(fetchImpl: typeof fetch = fetch): Promise<DepartamentoBorder> {
    DepartamentoBorder.cached ??= fetchImpl(BOUNDARY_LAYERS[0]!.url)
      .then((r) => r.json() as Promise<{ features?: Feature[] }>)
      .then((g) => DepartamentoBorder.fromGeoJson(g))
      .catch((e) => {
        DepartamentoBorder.cached = null
        throw e
      })
    return DepartamentoBorder.cached
  }

  contains(lat: number, lng: number): boolean {
    return this.polygons.some(
      ([outer, ...holes]) => !!outer && inRing(outer, lat, lng) && !holes.some((h) => inRing(h, lat, lng)),
    )
  }
}

function inRing(ring: Ring, lat: number, lng: number): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [ax, ay] = ring[i]!
    const [bx, by] = ring[j]!
    if (ay > lat !== by > lat && lng < ((bx - ax) * (lat - ay)) / (by - ay) + ax) inside = !inside
  }
  return inside
}
