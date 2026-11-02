// Address search for the publishing wizard (ADR-043 D6): Mapbox forward
// geocoding with the map's public token, limited to the departamento de Piura.
// The token already serves the map; api.mapbox.com is in the site's CSP.

/** The departamento de Piura's bounding box (lng, lat): search never leaves it. */
export const PIURA_BBOX = [-81.4, -6.4, -79.2, -4.0] as const

export interface AddressResult {
  id: string
  /** "Avenida Grau 123" */
  name: string
  /** "Castilla, Departamento de Piura, Perú" */
  place: string
  latitude: number
  longitude: number
  /** True for a street or a numbered address — a good start for "Dirección". */
  isStreet: boolean
}

interface MapboxFeature {
  id?: string
  geometry?: { coordinates?: [number, number] }
  properties?: {
    mapbox_id?: string
    feature_type?: string
    name?: string
    place_formatted?: string
    context?: { region?: { region_code_full?: string } }
  }
}

export const MIN_SEARCH_LENGTH = 3

/** The departamento de Piura in Mapbox's region codes. */
const PIURA_REGION = 'PE-PIU'

const inPiura = (lat: number, lng: number) =>
  lng >= PIURA_BBOX[0] && lng <= PIURA_BBOX[2] && lat >= PIURA_BBOX[1] && lat <= PIURA_BBOX[3]

/** Up to 5 places in Piura matching `query`. Throws when the search cannot be made. */
export async function searchAddresses(
  query: string,
  { token, near, fetchFn = fetch, signal }: { token: string; near?: { lat: number; lng: number }; fetchFn?: typeof fetch; signal?: AbortSignal },
): Promise<AddressResult[]> {
  const q = query.trim()
  if (q.length < MIN_SEARCH_LENGTH || !token) return []
  const params = new URLSearchParams({
    q,
    country: 'pe',
    bbox: PIURA_BBOX.join(','),
    language: 'es',
    limit: '5',
    access_token: token,
  })
  if (near) params.set('proximity', `${near.lng},${near.lat}`)
  const res = await fetchFn(`https://api.mapbox.com/search/geocode/v6/forward?${params}`, { signal })
  if (!res.ok) throw new Error(`address search ${res.status}`)
  const body = (await res.json()) as { features?: MapboxFeature[] }
  const out: AddressResult[] = []
  for (const f of body.features ?? []) {
    const [lng, lat] = f.geometry?.coordinates ?? []
    if (typeof lat !== 'number' || typeof lng !== 'number' || !inPiura(lat, lng)) continue
    // The box also covers parts of Tumbes, Lambayeque and Ecuador: only the
    // departamento de Piura counts (hostile review 2026-11-02).
    if (f.properties?.context?.region?.region_code_full !== PIURA_REGION) continue
    const type = f.properties?.feature_type ?? ''
    out.push({
      id: f.properties?.mapbox_id ?? f.id ?? `${lat},${lng}`,
      name: f.properties?.name ?? q,
      place: f.properties?.place_formatted ?? '',
      latitude: lat,
      longitude: lng,
      isStreet: type === 'street' || type === 'address',
    })
  }
  return out
}
