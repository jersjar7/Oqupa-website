// Clicking an "N aquí" group must show its listings: every one inside the
// part of the map that is not covered (on a phone, above VER LISTA and
// Filtros), with room for a pin's width and height, and never zoomed out
// further than the zoom at which the group splits. Same rule as the app.
//
// Found 2026-10-24 (overnight audit): the click zoomed to the split zoom
// centred on the group's centre, which splits it but does not promise the
// members land on screen or clear of the buttons.
import { describe, it, expect } from 'vitest'
import { framingForGroup, PIN_HALF_WIDTH_PX, PIN_HEIGHT_PX, type LatLng } from '@/lib/map/zoomPolicy'

function px(p: LatLng, zoom: number) {
  const scale = 512 * 2 ** zoom
  const s = Math.sin((p.lat * Math.PI) / 180)
  return { x: ((p.lng + 180) / 360) * scale, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale }
}

const w = 390, h = 772, top = 12, bottom = 140

function frame(members: LatLng[], expansion = 13, max = 19) {
  return framingForGroup({ members, width: w, height: h, top, bottom, expansionZoom: expansion, maxZoom: max })
}

/** Where each member lands once the camera centre is [f] (no map padding). */
function onScreen(f: ReturnType<typeof frame>, members: LatLng[]) {
  const c = px({ lat: f.lat, lng: f.lng }, f.zoom)
  return members.map((m) => {
    const p = px(m, f.zoom)
    return { x: p.x - c.x + w / 2, y: p.y - c.y + h / 2 }
  })
}

const spread: LatLng[] = [
  { lat: -5.198, lng: -80.627 },
  { lat: -5.201, lng: -80.615 },
  { lat: -5.1905, lng: -80.6205 },
  { lat: -5.205, lng: -80.623 },
  { lat: -5.194, lng: -80.612 },
]

describe('framingForGroup', () => {
  it('every member lands inside the uncovered band, with room for its pin', () => {
    for (const p of onScreen(frame(spread), spread)) {
      expect(p.x).toBeGreaterThanOrEqual(PIN_HALF_WIDTH_PX)
      expect(p.x).toBeLessThanOrEqual(w - PIN_HALF_WIDTH_PX)
      expect(p.y - PIN_HEIGHT_PX).toBeGreaterThanOrEqual(top)
      expect(p.y).toBeLessThanOrEqual(h - bottom)
    }
  })

  it('never zooms out past the split zoom, even for a wide group', () => {
    expect(frame([{ lat: -5.1, lng: -80.75 }, { lat: -5.3, lng: -80.55 }], 13).zoom).toBe(13)
  })

  it('a tight group zooms in further than the split zoom, so its pins separate', () => {
    expect(frame([{ lat: -5.198, lng: -80.627 }, { lat: -5.1983, lng: -80.6266 }], 13).zoom).toBeGreaterThan(13)
  })

  it('never beyond the last zoom, even for listings in the same building', () => {
    expect(frame([{ lat: -5.198, lng: -80.627 }, { lat: -5.198, lng: -80.627 }], 13, 19).zoom).toBe(19)
  })

  it('a single member is centred left to right', () => {
    const one = [{ lat: -5.198, lng: -80.627 }]
    expect(onScreen(frame(one), one)[0]!.x).toBeCloseTo(w / 2, 1)
  })
})
