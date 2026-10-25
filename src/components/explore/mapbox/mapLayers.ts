// Map layers shared by the explore map and the location picker: the
// departamento de Piura border, and the faint circle shown for a selected
// listing that hides its exact location (350 m, as in the app).
import type { Map as MapboxMap, GeoJSONSource } from 'mapbox-gl'
import { BOUNDARY_LAYERS } from '@/lib/constants'
import type { ListingWithProperty } from '@/types/explore'

const BORDER_SOURCE = 'departamento-border'
const CIRCLE_SOURCE = 'privacy-circle'
export const PRIVACY_CIRCLE_METERS = 350

export function addDepartamentoBorder(map: MapboxMap) {
  const layer = BOUNDARY_LAYERS[0]
  if (!layer || map.getSource(BORDER_SOURCE)) return
  map.addSource(BORDER_SOURCE, { type: 'geojson', data: layer.url })
  map.addLayer({
    id: `${BORDER_SOURCE}-fill`, type: 'fill', source: BORDER_SOURCE,
    paint: { 'fill-color': layer.fillColor, 'fill-opacity': layer.fillOpacity },
  })
  map.addLayer({
    id: `${BORDER_SOURCE}-line`, type: 'line', source: BORDER_SOURCE,
    paint: { 'line-color': layer.strokeColor, 'line-width': layer.strokeWeight },
  })
}

/** A geographic circle as a GeoJSON ring (Mapbox circles are in pixels). */
export function circleRing(lat: number, lng: number, meters: number, steps = 48): [number, number][] {
  const ring: [number, number][] = []
  const dLat = meters / 111_320
  const dLng = meters / (111_320 * Math.cos((lat * Math.PI) / 180))
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI
    ring.push([lng + dLng * Math.cos(t), lat + dLat * Math.sin(t)])
  }
  return ring
}

export function setPrivacyCircle(map: MapboxMap, item: ListingWithProperty | null) {
  const data: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: item
      ? [{
          type: 'Feature', properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [circleRing(
              item.listing.displayLatitude ?? item.property.location.latitude,
              item.listing.displayLongitude ?? item.property.location.longitude,
              PRIVACY_CIRCLE_METERS,
            )],
          },
        }]
      : [],
  }
  const source = map.getSource(CIRCLE_SOURCE) as GeoJSONSource | undefined
  if (source) {
    source.setData(data)
    return
  }
  map.addSource(CIRCLE_SOURCE, { type: 'geojson', data })
  map.addLayer({ id: `${CIRCLE_SOURCE}-fill`, type: 'fill', source: CIRCLE_SOURCE, paint: { 'fill-color': '#008080', 'fill-opacity': 0.08 } })
  map.addLayer({ id: `${CIRCLE_SOURCE}-line`, type: 'line', source: CIRCLE_SOURCE, paint: { 'line-color': '#ffffff', 'line-width': 2 } })
}
