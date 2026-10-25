// Where the map puts things around a chosen listing (UX review, 2026-10-25):
// - on a computer the listing's card opens above its pin, or below it when the
//   pin is too close to the top of the map for the card to fit (it was cut
//   off, and its hover version covered the filters);
// - on a phone the card at the bottom and the VER LISTA button covered the
//   listing just tapped. The map moves only when the listing is actually
//   hidden, and only enough to show it — Jerson does not want the map moving
//   when nobody asked (ADR-033).
import { describe, it, expect } from 'vitest'
import { cardSide, panToReveal, PREVIEW_CARD_HEIGHT } from '../mapView'

describe('cardSide', () => {
  it('above the pin when there is room', () => {
    expect(cardSide({ pinTop: 600, mapTop: 130 })).toBe('above')
  })
  it('below the pin when the card would be cut off at the top of the map', () => {
    expect(cardSide({ pinTop: 300, mapTop: 130 })).toBe('below')
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
