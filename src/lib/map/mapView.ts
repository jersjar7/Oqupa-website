// Where the map puts things around a chosen listing (UX review, 2026-10-25).
// Pure, so the rules are tested without a map.

/** The listing card that opens on the map on a computer: photo, price, type
 *  and details — about 300 px tall (measured on staging at 1440 × 900). */
export const PREVIEW_CARD_HEIGHT = 300
const CARD_GAP = 20

/** Open the card above the pin, unless the pin is too close to the top of the
 *  map for it to fit — then below, so it is never cut off or laid over the
 *  filters. `pinTop` and `mapTop` are screen positions in px. */
export function cardSide({ pinTop, mapTop }: { pinTop: number; mapTop: number }): 'above' | 'below' {
  return pinTop - PREVIEW_CARD_HEIGHT - CARD_GAP >= mapTop ? 'above' : 'below'
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
