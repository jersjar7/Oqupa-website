// Where the map puts things around a chosen listing (UX review, 2026-10-25).
// Pure, so the rules are tested without a map.

/** The listing card that opens on the map on a computer: the slim card,
 *  a 96-px photo with 8 px around it (UX review 2026-10-25; it was 300). */
export const PREVIEW_CARD_HEIGHT = 115
const CARD_GAP = 20

/** Open the card above the pin, unless the pin is too close to the top of the
 *  map for it to fit — then below, so it is never cut off or laid over the
 *  filters. `pinTop` and `mapTop` are screen positions in px. */
export function cardSide({ pinTop, mapTop }: { pinTop: number; mapTop: number }): 'above' | 'below' {
  return pinTop - PREVIEW_CARD_HEIGHT - CARD_GAP >= mapTop ? 'above' : 'below'
}

/** The least distance kept between the floating card and any edge of the map. */
export const CARD_MARGIN = 8
/** Where the pin's top sits above its point (a plain pin), and how far the card
 *  keeps from the point above it / below it. */
const PIN_HEIGHT = 45
const CARD_ABOVE_POINT = 56
const CARD_BELOW_POINT = 12

/**
 * Where the computer's floating card goes, as its top-left corner in px from
 * the map's top-left. Beside the pin as before (above it, or below near the
 * top), centred on it — then slid so the whole card stays inside the map,
 * CARD_MARGIN from every edge. On production a listing near the left edge
 * opened its card half off the map (2026-11-02). The map never moves for it
 * (ADR-033/036): the card moves instead. `lift` is the raised pin's extra
 * height (its leader line, ADR-048).
 */
export function previewCardPosition({ point, map, card, lift }: {
  point: { x: number; y: number }
  map: { width: number; height: number }
  card: { width: number; height: number }
  lift: number
}): { left: number; top: number; side: 'above' | 'below' } {
  const side = cardSide({ pinTop: point.y - PIN_HEIGHT - lift, mapTop: 0 })
  const left = point.x - card.width / 2
  const top = side === 'above' ? point.y - CARD_ABOVE_POINT - lift - card.height : point.y + CARD_BELOW_POINT
  const clamp = (v: number, size: number, room: number) =>
    Math.max(CARD_MARGIN, Math.min(v, room - size - CARD_MARGIN))
  return { left: clamp(left, card.width, map.width), top: clamp(top, card.height, map.height), side }
}

/**
 * On a phone, the card at the bottom (and the VER LISTA button above it)
 * covers part of the map. If the listing just chosen is hidden there, how far
 * to move the map up (px; negative = down) to bring it to the middle of what
 * is still visible. 0 when it is already visible: Jerson does not want the
 * map moving when nobody asked (ADR-033), so it moves only when needed.
 */
export function panToReveal({ pointY, mapHeight, coveredBottom, margin = 24 }: {
  pointY: number
  mapHeight: number
  coveredBottom: number
  margin?: number
}): number {
  if (coveredBottom <= 0) return 0
  const visibleBottom = mapHeight - coveredBottom
  if (pointY >= margin && pointY <= visibleBottom - margin) return 0
  return pointY - visibleBottom / 2
}

/** Layering on the explore page (Jerson, 2026-10-25: "Filters should appear
 *  above any card"): every card on the map — hover or open — sits below the
 *  filter bar and its panel. Pins use 2–4. */
export const MAP_CARD_Z = 10
export const MAP_FILTERS_Z = 20
