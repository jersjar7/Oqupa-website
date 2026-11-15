// ADR-058 R2 — the visitor's place, only when this browser ALREADY allows
// location for oqupa.com (no prompt is ever shown for this). The point goes to
// the server counter, which turns it into a district of Piura or "outside" and
// drops it. Rounded to about 100 m first.

export type Place = { lat: number; lng: number }

let cached: { at: number; place: Place | null } | null = null
const KEEP_MS = 10 * 60 * 1000

type Nav = Pick<Navigator, 'permissions' | 'geolocation'>

export async function browserPlace(nav: Nav | undefined = typeof navigator !== 'undefined' ? navigator : undefined, now = Date.now()): Promise<Place | null> {
  if (cached && now - cached.at < KEEP_MS) return cached.place
  let place: Place | null = null
  try {
    if (nav?.permissions?.query && nav.geolocation) {
      const status = await nav.permissions.query({ name: 'geolocation' as PermissionName })
      if (status.state === 'granted') {
        place = await new Promise<Place | null>((resolve) => {
          nav.geolocation.getCurrentPosition(
            (p) => resolve({ lat: Math.round(p.coords.latitude * 1000) / 1000, lng: Math.round(p.coords.longitude * 1000) / 1000 }),
            () => resolve(null),
            { maximumAge: KEEP_MS, timeout: 1500, enableHighAccuracy: false },
          )
        })
      }
    }
  } catch {
    place = null
  }
  cached = { at: now, place }
  return place
}

/** For tests. */
export function resetBrowserPlace(): void {
  cached = null
}
