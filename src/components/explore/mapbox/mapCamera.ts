// The explore map's remembered camera. A new key, separate from the old Google
// map's ('oqupa-map-camera'): Mapbox draws 512-px tiles, so the same zoom number
// shows a different area, and an old saved Google zoom would open one level too
// close.
export const MAPBOX_CAMERA_KEY = 'oqupa-map-camera-mapbox'
/** ≈ the old Google default of 13 (Mapbox zoom = Google zoom − 1). */
export const MAPBOX_DEFAULT_ZOOM = 12
/** After publishing, the new listing is shown at street level. */
export const MAPBOX_FOCUS_ZOOM = 15

export interface SavedCamera { lat: number; lng: number; zoom: number }

export function loadMapboxCamera(storage: Pick<Storage, 'getItem'> | null = safeStorage()): SavedCamera | null {
  try {
    const raw = storage?.getItem(MAPBOX_CAMERA_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<SavedCamera>
    if (typeof p.lat === 'number' && typeof p.lng === 'number' && typeof p.zoom === 'number') {
      return { lat: p.lat, lng: p.lng, zoom: p.zoom }
    }
    return null
  } catch {
    return null
  }
}

export function saveMapboxCamera(lat: number, lng: number, zoom: number, storage: Pick<Storage, 'setItem'> | null = safeStorage()) {
  try {
    storage?.setItem(MAPBOX_CAMERA_KEY, JSON.stringify({ lat, lng, zoom }))
  } catch {
    // A blocked storage only costs the remembered view.
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}
