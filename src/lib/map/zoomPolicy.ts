// ADR-031 item 16 (Jerson, 2026-10-24): zoomed far out every listing is a
// small dot with its type drawing — the way Zillow and Redfin show a city;
// closer in, one style-A pin per listing (no groups since ADR-032). A dot only ever turns into its
// own pin: one change of shape. Same numbers as the app's MapZoomPolicy
// (Mapbox's 512-px tiles on both). (Map plan step 2 drew district cards here;
// Jerson dropped them — "The districts are already displayed on the base map
// itself.")

/** Below this zoom the map draws one dot per listing. At 12 a phone shows
 *  ~15 km, the whole Piura / Castilla / Veintiséis de Octubre metro. */
export const DOTS_BELOW_ZOOM = 12

/** Where tapping a dot takes the camera: close enough to read the pins. */
export const DOT_TAP_ZOOM = DOTS_BELOW_ZOOM + 2

export const showsDots = (zoom: number): boolean => zoom < DOTS_BELOW_ZOOM
