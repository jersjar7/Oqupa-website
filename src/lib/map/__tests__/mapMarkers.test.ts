// What the website's map draws at each zoom (ADR-031 items 16–18), mirroring
// the app's marker pipeline: far out one small dot per listing; closer in
// style-A pins, with "N aquí" groups where pins would overlap. Boosted listings
// are always their own (photo) pin at every zoom, never inside a dot field or a
// group; the selected listing always shows on its own.
import { describe, it, expect } from 'vitest'
import { MapMarkerIndex, CLUSTER_RADIUS_PX, CLUSTER_MAX_ZOOM, PIN_MAX_WIDTH_PX, PIN_MAX_HEIGHT_PX } from '../mapMarkers'
import { mapListing } from './mapListingFixture'

const metro = { south: -5.35, west: -80.8, north: -5.05, east: -80.5 }
const sameSpot = (id: string, extra = {}) => mapListing({ id, exact: false, lat: -5.1945, lng: -80.6328, distrito: 'Piura', ...extra })

describe('MapMarkerIndex', () => {
  // Jerson approved replacing the old "20 px / ceiling 15" expectations
  // (ADR-031 item 17): labelled style-A pins are wide, so the radius covers a
  // whole pin and two pins can never overlap.
  it('uses the same grouping numbers as the app', () => {
    expect(CLUSTER_RADIUS_PX).toBe(184)
    expect(CLUSTER_MAX_ZOOM).toBe(18)
  })

  it('the merge radius covers a whole pin, so pins can never overlap', () => {
    expect(CLUSTER_RADIUS_PX).toBeGreaterThanOrEqual(Math.hypot(PIN_MAX_WIDTH_PX, PIN_MAX_HEIGHT_PX))
  })

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

  it('close in: listings at the same spot become one word group with their count', () => {
    const out = new MapMarkerIndex([sameSpot('a'), sameSpot('b'), sameSpot('c')]).markersFor(metro, 13, null)
    expect(out).toHaveLength(1)
    expect(out[0]!.kind).toBe('group')
    if (out[0]!.kind === 'group') {
      expect(out[0]!.count).toBe(3)
      expect(out[0]!.expansionZoom).toBeGreaterThan(13)
    }
  })

  it('close in: listings far apart are each their own pin', () => {
    const out = new MapMarkerIndex([
      mapListing({ id: 'a', lat: -5.19, lng: -80.63 }),
      mapListing({ id: 'b', lat: -5.15, lng: -80.70 }),
    ]).markersFor(metro, 13, null)
    expect(out.map((m) => m.kind)).toEqual(['pin', 'pin'])
  })

  it('a 240 m pair is one group at zoom 13 (its pins would overlap)', () => {
    // At zoom 13 one pixel ≈ 9.5 m at Piura: 240 m ≈ 25 px, far inside a pin.
    const out = new MapMarkerIndex([
      mapListing({ id: 'a', lat: -5.1945, lng: -80.6328 }),
      mapListing({ id: 'b', lat: -5.1945 + 240 / 111_320, lng: -80.6328 }),
    ]).markersFor(metro, 13, null)
    expect(out.map((m) => m.kind)).toEqual(['group'])
  })

  it('past the grouping ceiling every listing is its own pin', () => {
    const pair = [sameSpot('a'), sameSpot('b')]
    expect(new MapMarkerIndex(pair).markersFor(metro, CLUSTER_MAX_ZOOM, null).map((m) => m.kind)).toEqual(['group'])
    expect(new MapMarkerIndex(pair).markersFor(metro, CLUSTER_MAX_ZOOM + 1, null).filter((m) => m.kind === 'pin')).toHaveLength(2)
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
