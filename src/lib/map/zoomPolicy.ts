// ADR-031 item 16 (Jerson, 2026-10-24): zoomed far out every listing is a
// small dot with its type drawing — the way Zillow and Redfin show a city;
// closer in, style-A pins and "N aquí" groups. A dot only ever turns into its
// own pin: one change of shape. Same numbers as the app's MapZoomPolicy
// (Mapbox's 512-px tiles on both). (Map plan step 2 drew district cards here;
// Jerson dropped them — "The districts are already displayed on the base map
// itself.")

/** Below this zoom the map draws one dot per listing. At 12 a phone shows
 *  ~15 km, the whole Piura / Castilla / Veintiséis de Octubre metro. */
export const DOTS_BELOW_ZOOM = 12

/** Where tapping a dot takes the camera: close enough that the tapped listing
 *  shows as its own pin (or inside a small group of genuinely close ones). */
export const DOT_TAP_ZOOM = DOTS_BELOW_ZOOM + 2

export const showsDots = (zoom: number): boolean => zoom < DOTS_BELOW_ZOOM

export interface LatLng { lat: number; lng: number }

/** Half the widest pin and a pin's full height with its point, in px: the
 *  room a member needs so its whole pin is on screen, not just its point. */
export const PIN_HALF_WIDTH_PX = 88
export const PIN_HEIGHT_PX = 60
const FRAMING_MARGIN_PX = 8

const mercX = (lng: number) => (lng + 180) / 360
const mercY = (lat: number) => {
  const s = Math.sin((lat * Math.PI) / 180)
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)
}
const latOf = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI

/**
 * Where to put the camera when an "N aquí" group is clicked (same rule as the
 * app's MapZoomPolicy.framingForGroup): the closest zoom at which every
 * member's pin fits between [top] and [height − bottom] — the part of the map
 * nothing covers — but never further out than the zoom at which the group
 * splits, and never past [maxZoom]. Returns the camera centre for a map with
 * no padding, so the band's middle lands where the members' middle is.
 */
export function framingForGroup(o: {
  members: LatLng[]
  width: number
  height: number
  top: number
  bottom: number
  expansionZoom: number
  maxZoom: number
}): LatLng & { zoom: number } {
  const xs = o.members.map((m) => mercX(m.lng))
  const ys = o.members.map((m) => mercY(m.lat))
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const availW = o.width - 2 * (PIN_HALF_WIDTH_PX + FRAMING_MARGIN_PX)
  const availH = o.height - o.top - o.bottom - PIN_HEIGHT_PX - 2 * FRAMING_MARGIN_PX
  const fitFor = (span: number, avail: number) => (span <= 0 ? Infinity : Math.log2(Math.max(avail, 1) / (span * 512)))
  const fit = Math.min(fitFor(maxX - minX, availW), fitFor(maxY - minY, availH))
  const zoom = Math.max(o.expansionZoom, Math.min(fit, o.maxZoom))
  const scale = 512 * 2 ** zoom
  // The members' pins, top of the highest pin to the lowest point, centred in the band.
  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2 - PIN_HEIGHT_PX / 2 / scale
  const bandMiddle = o.top + (o.height - o.top - o.bottom) / 2
  const centreY = midY + (o.height / 2 - bandMiddle) / scale
  return { lat: latOf(centreY), lng: midX * 360 - 180, zoom }
}
