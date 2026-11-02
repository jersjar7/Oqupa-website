// My Location (ADR-046 #4) with the ADR-040 rule — a port of the app's
// home_map_default_view.dart: in the Piura region the map goes to the person,
// otherwise (or with location off or refused) to the default Piura view.

export interface LatLng { lat: number; lng: number }
export interface CameraTarget extends LatLng { zoom: number }

/** Midway between Piura city and Sullana, both clearly on screen (Jerson,
 *  2026-11-01). Mapbox zoom, as in the app. */
export const HOME_DEFAULT_VIEW: CameraTarget = { lat: -5.0492, lng: -80.659, zoom: 9 }

/** Roughly the Piura department, the app's box. */
export function isInPiuraRegion(p: LatLng): boolean {
  return p.lat >= -6.4 && p.lat <= -3.3 && p.lng >= -81.4 && p.lng <= -79.1
}

export function myLocationTarget(position: LatLng | null): CameraTarget {
  return position && isInPiuraRegion(position) ? { ...position, zoom: 15 } : HOME_DEFAULT_VIEW
}

/** The browser's position, or null when it is off, refused or fails. */
export function currentPosition(
  geo: Geolocation | undefined = typeof navigator === 'undefined' ? undefined : navigator.geolocation,
  timeoutMs = 10000,
): Promise<LatLng | null> {
  if (!geo) return Promise.resolve(null)
  return new Promise((resolve) => {
    try {
      geo.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60000 },
      )
    } catch {
      resolve(null)
    }
  })
}
