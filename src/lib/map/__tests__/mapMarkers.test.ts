// What the website's map draws at each zoom (map plan steps 2 and 4, ADR-031),
// mirroring the app's marker pipeline: only two views — district cards when far
// out; listing pins and word groups when close. Boosted listings are never put
// in a group; the selected listing always shows on its own.
import { describe, it, expect } from 'vitest'
import { MapMarkerIndex, CLUSTER_RADIUS_PX, CLUSTER_MAX_ZOOM } from '../mapMarkers'
import { mapListing } from './mapListingFixture'

const metro = { south: -5.35, west: -80.8, north: -5.05, east: -80.5 }
const sameSpot = (id: string, extra = {}) => mapListing({ id, exact: false, lat: -5.1945, lng: -80.6328, distrito: 'Piura', ...extra })

describe('MapMarkerIndex', () => {
  it('uses the same grouping numbers as the app', () => {
    expect(CLUSTER_RADIUS_PX).toBe(20)
    expect(CLUSTER_MAX_ZOOM).toBe(15)
  })

  it('far out: district cards only, counting every listing', () => {
    const items = [sameSpot('a'), sameSpot('b'), mapListing({ id: 'c', exact: false, distrito: 'CASTILLA', lat: -5.18, lng: -80.61 })]
    const out = new MapMarkerIndex(items).markersFor(metro, 11, null)
    expect(out.every((m) => m.kind === 'district')).toBe(true)
    expect(out.map((m) => (m.kind === 'district' ? `${m.group.name}:${m.group.count}` : '')).sort()).toEqual(['Castilla:1', 'Piura:2'])
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

  it('from zoom 16 every listing is its own pin', () => {
    const out = new MapMarkerIndex([sameSpot('a'), sameSpot('b')]).markersFor(metro, 16, null)
    expect(out.filter((m) => m.kind === 'pin')).toHaveLength(2)
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

  it('outside the visible area nothing is drawn (except district cards, which cover their whole district)', () => {
    const far = { south: -4.0, west: -79.0, north: -3.9, east: -78.9 }
    expect(new MapMarkerIndex([sameSpot('a')]).markersFor(far, 13, null)).toEqual([])
  })

  it('an empty map draws nothing', () => {
    expect(new MapMarkerIndex([]).markersFor(metro, 13, null)).toEqual([])
    expect(new MapMarkerIndex([]).markersFor(metro, 9, null)).toEqual([])
  })
})
