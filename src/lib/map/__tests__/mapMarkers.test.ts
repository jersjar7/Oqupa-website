// What the website's map draws at each zoom (ADR-031 item 16, ADR-032),
// mirroring the app's marker pipeline: far out one small dot per listing;
// closer in one style-A pin per listing, overlapping freely — the only shared
// "N aquí" pin is for listings at the identical point (one building). Boosted listings
// are always their own (photo) pin at every zoom, never inside a dot field or a
// group; the selected listing always shows on its own.
import { describe, it, expect } from 'vitest'
import { MapMarkerIndex } from '../mapMarkers'
import { mapListing } from './mapListingFixture'

const metro = { south: -5.35, west: -80.8, north: -5.05, east: -80.5 }
const sameSpot = (id: string, extra = {}) => mapListing({ id, exact: false, lat: -5.1945, lng: -80.6328, distrito: 'Piura', ...extra })

describe('MapMarkerIndex', () => {
  it('far out: one dot per listing in view — no counts, no groups', () => {
    const items = [sameSpot('a'), sameSpot('b'), mapListing({ id: 'c', exact: false, distrito: 'CASTILLA', lat: -5.18, lng: -80.61 })]
    const out = new MapMarkerIndex(items).markersFor(metro, 11, null)
    expect(out.map((m) => m.kind)).toEqual(['dot', 'dot', 'dot'])
    expect(out.map((m) => (m.kind === 'dot' ? m.item.listing.id : '')).sort()).toEqual(['a', 'b', 'c'])
  })

  it('far out: a boosted listing is a dot the same size as the others (gold edge drawn by the dot)', () => {
    const out = new MapMarkerIndex([sameSpot('a'), sameSpot('boost', { boosted: true, boostScore: 2 })]).markersFor(metro, 9, null)
    const byId = Object.fromEntries(out.map((m) => [m.kind === 'group' ? 'g' : m.item.listing.id, m.kind]))
    expect(byId).toEqual({ a: 'dot', boost: 'dot' })
  })

  it('far out: dots outside the visible area are not drawn', () => {
    const far = { south: -4.0, west: -79.0, north: -3.9, east: -78.9 }
    expect(new MapMarkerIndex([sameSpot('a')]).markersFor(far, 9, null)).toEqual([])
  })

  it('close in: listings at the identical point share one pin with their count, at every zoom', () => {
    for (const z of [12, 13, 16, 18, 19, 22]) {
      const out = new MapMarkerIndex([sameSpot('a'), sameSpot('b'), sameSpot('c')]).markersFor(metro, z, null)
      expect(out).toHaveLength(1)
      expect(out[0]!.kind === 'group' && out[0]!.count).toBe(3)
    }
  })

  it('a shared pin carries its listings, so a click can list exactly those', () => {
    const out = new MapMarkerIndex([sameSpot('a'), sameSpot('b'), sameSpot('c')]).markersFor(metro, 13, null)
    const g = out[0]!
    expect(g.kind === 'group' && g.items.map((i) => i.listing.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('close in: listings far apart are each their own pin', () => {
    const out = new MapMarkerIndex([
      mapListing({ id: 'a', lat: -5.19, lng: -80.63 }),
      mapListing({ id: 'b', lat: -5.15, lng: -80.70 }),
    ]).markersFor(metro, 13, null)
    expect(out.map((m) => m.kind)).toEqual(['pin', 'pin'])
  })

  // ADR-032 (Jerson, 2026-10-25): no groups — replaces "a 240 m pair is one
  // group" and the grouping ceiling (ADR-031 item 17).
  it('close in: neighbours are each their own pin at every zoom, even if the pins overlap', () => {
    for (const metres of [240, 20, 1]) {
      for (const z of [12, 13, 16, 18, 22]) {
        const out = new MapMarkerIndex([
          mapListing({ id: 'a', lat: -5.1945, lng: -80.6328 }),
          mapListing({ id: 'b', lat: -5.1945 + metres / 111_320, lng: -80.6328 }),
        ]).markersFor(metro, z, null)
        expect(out.map((m) => m.kind)).toEqual(['pin', 'pin'])
      }
    }
  })

  it('boosted listings are never inside a group, and groups do not count them', () => {
    const out = new MapMarkerIndex([sameSpot('a'), sameSpot('b'), sameSpot('boost', { boosted: true, boostScore: 2 })]).markersFor(metro, 13, null)
    const pins = out.filter((m) => m.kind === 'pin')
    const groups = out.filter((m) => m.kind === 'group')
    expect(pins.map((m) => (m.kind === 'pin' ? m.item.listing.id : ''))).toEqual(['boost'])
    expect(groups[0]!.kind === 'group' && groups[0]!.count).toBe(2)
  })

  it('the selected listing shows on its own, even inside a group', () => {
    const out = new MapMarkerIndex([sameSpot('a'), sameSpot('b'), sameSpot('c')]).markersFor(metro, 13, 'b')
    const pins = out.filter((m) => m.kind === 'pin')
    expect(pins.map((m) => (m.kind === 'pin' ? m.item.listing.id : ''))).toEqual(['b'])
    const g = out.find((m) => m.kind === 'group')
    expect(g && g.kind === 'group' ? g.count : 0).toBe(2)
  })

  it('outside the visible area nothing is drawn', () => {
    const far = { south: -4.0, west: -79.0, north: -3.9, east: -78.9 }
    expect(new MapMarkerIndex([sameSpot('a')]).markersFor(far, 13, null)).toEqual([])
  })

  it('an empty map draws nothing', () => {
    expect(new MapMarkerIndex([]).markersFor(metro, 13, null)).toEqual([])
    expect(new MapMarkerIndex([]).markersFor(metro, 9, null)).toEqual([])
  })
})
