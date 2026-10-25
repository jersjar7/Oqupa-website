// Map plan step 2 (ADR-031): only two views ever. Zoomed far out, one card per
// district; closer in, listing pins and word groups. Same numbers as the app's
// MapZoomPolicy (Mapbox's 512-px tiles on both).
import type { Bounds } from './mapPoint'

/** Below this zoom the map draws district cards. At 12 a phone shows ~15 km,
 *  the whole Piura / Castilla / Veintiséis de Octubre metro. */
export const DISTRICT_CARDS_BELOW_ZOOM = 12
/** Closest a district-card tap zooms in. */
export const MAX_FIT_ZOOM = 15

export const showsDistrictCards = (zoom: number): boolean => zoom < DISTRICT_CARDS_BELOW_ZOOM

/** The zoom that frames [bounds] on a w×h screen with [margin] px each side —
 *  never below the card threshold (a tap always shows listings), never above
 *  MAX_FIT_ZOOM. */
export function zoomToFit(bounds: Bounds, viewportW: number, viewportH: number, margin = 60): number {
  const usableW = Math.max(viewportW - 2 * margin, 80)
  const usableH = Math.max(viewportH - 2 * margin, 80)
  const mercY = (lat: number) => {
    const r = (lat * Math.PI) / 180
    return Math.log(Math.tan(Math.PI / 4 + r / 2)) / (2 * Math.PI)
  }
  const spanX = Math.abs(bounds.east - bounds.west) / 360
  const spanY = Math.abs(mercY(bounds.north) - mercY(bounds.south))
  const zoomFor = (span: number, px: number) => (span <= 0 ? Infinity : Math.log2(px / (512 * span)))
  const z = Math.min(zoomFor(spanX, usableW), zoomFor(spanY, usableH))
  return Math.min(Math.max(z, DISTRICT_CARDS_BELOW_ZOOM), MAX_FIT_ZOOM)
}
