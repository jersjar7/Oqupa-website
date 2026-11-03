// Where the map puts things around a chosen listing (UX review, 2026-10-25):
// - on a computer the listing's card opens above its pin, or below it when the
//   pin is too close to the top of the map for the card to fit (it was cut
//   off, and its hover version covered the filters);
// - on a phone the card at the bottom and the VER LISTA button covered the
//   listing just tapped. The map moves only when the listing is actually
//   hidden, and only enough to show it — Jerson does not want the map moving
//   when nobody asked (ADR-033).
import { describe, it, expect } from 'vitest'
import { cardSide, panToReveal, previewCardPosition, CARD_MARGIN, PREVIEW_CARD_HEIGHT, MAP_CARD_Z, MAP_FILTERS_Z } from '../mapView'

describe('cardSide', () => {
  it('above the pin when there is room', () => {
    expect(cardSide({ pinTop: 600, mapTop: 130 })).toBe('above')
  })
  it('below the pin when the card would be cut off at the top of the map', () => {
    expect(cardSide({ pinTop: 150, mapTop: 130 })).toBe('below')
    expect(cardSide({ pinTop: 130 + PREVIEW_CARD_HEIGHT + 10, mapTop: 130 })).toBe('below')
  })
  it('exactly enough room: above', () => {
    expect(cardSide({ pinTop: 130 + PREVIEW_CARD_HEIGHT + 30, mapTop: 130 })).toBe('above')
  })
})

describe('panToReveal', () => {
  const map = { mapHeight: 830, coveredBottom: 450 } // visible band: 0–380

  it('a listing already in view: the map stays where it is', () => {
    expect(panToReveal({ ...map, pointY: 200 })).toBe(0)
  })
  it('a listing under the card: moves it to the middle of what is still visible', () => {
    expect(panToReveal({ ...map, pointY: 600 })).toBe(600 - 190)
  })
  it('a listing just under the edge (inside the margin) counts as hidden', () => {
    expect(panToReveal({ ...map, pointY: 370 })).toBe(370 - 190)
  })
  it('nothing covers the map: never moves', () => {
    expect(panToReveal({ mapHeight: 830, coveredBottom: 0, pointY: 820 })).toBe(0)
  })
  it('above the top of the map: brought down into view', () => {
    expect(panToReveal({ ...map, pointY: -40 })).toBe(-40 - 190)
  })
})

// Jerson, 2026-10-25: "Filters should appear above any card." Every card on
// the map (hover or open) is layered below the filter bar and its panel.
describe('layering', () => {
  it('cards on the map sit below the filters', () => {
    expect(MAP_CARD_Z).toBeLessThan(MAP_FILTERS_Z)
  })
})

// Production, tablet/computer width (2026-11-02): a listing near the left edge
// of the map opened its floating card half off the map ("…50 mil"). The card
// is kept wholly inside the map, a small margin from every edge, beside the
// raised pin where it fits; the map itself never moves (ADR-033/036).
describe('previewCardPosition', () => {
  const map = { width: 800, height: 900 }
  const card = { width: 370, height: PREVIEW_CARD_HEIGHT }
  const at = (x: number, y: number, lift = 0) => previewCardPosition({ point: { x, y }, map, card, lift })

  it('in the open: centred above the pin', () => {
    const p = at(400, 500)
    expect(p.side).toBe('above')
    expect(p.left).toBe(400 - 185)
    expect(p.top + card.height).toBeLessThan(500 - 45)
  })

  it('a raised pin pushes the card up by the line', () => {
    expect(at(400, 500, 27).top).toBe(at(400, 500).top - 27)
  })

  it('near the left edge: slid right to stay inside, still above the pin', () => {
    const p = at(20, 500)
    expect(p.left).toBe(CARD_MARGIN)
    expect(p.side).toBe('above')
  })

  it('near the right edge: slid left to stay inside', () => {
    expect(at(790, 500).left).toBe(800 - 370 - CARD_MARGIN)
  })

  it('near the top: below the pin, inside the map', () => {
    const p = at(400, 60)
    expect(p.side).toBe('below')
    expect(p.top).toBeGreaterThanOrEqual(CARD_MARGIN)
  })

  it('near the bottom with no room below: kept inside the bottom edge', () => {
    const p = previewCardPosition({ point: { x: 400, y: 100 }, map: { width: 800, height: 200 }, card, lift: 0 })
    expect(p.top + card.height).toBeLessThanOrEqual(200 - CARD_MARGIN)
    expect(p.top).toBeGreaterThanOrEqual(CARD_MARGIN)
  })

  it('every corner: all four edges inside the map', () => {
    for (const [x, y] of [[0, 0], [800, 0], [0, 900], [800, 900], [5, 450], [795, 450]] as const) {
      const p = at(x, y, 27)
      expect(p.left).toBeGreaterThanOrEqual(CARD_MARGIN)
      expect(p.left + card.width).toBeLessThanOrEqual(map.width - CARD_MARGIN)
      expect(p.top).toBeGreaterThanOrEqual(CARD_MARGIN)
      expect(p.top + card.height).toBeLessThanOrEqual(map.height - CARD_MARGIN)
    }
  })
})
