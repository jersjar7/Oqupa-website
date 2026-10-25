// Ported from the app's map_district_groups_test.dart (map plan step 2).
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DistrictResolver } from '../districtResolver'
import { districtNameFor, groupByDistrict, districtCountLine, spreadPx, OTROS_LUGARES } from '../districtGroups'
import { mapListing } from './mapListingFixture'

let resolver: DistrictResolver
const at = (lat: number, lng: number) => resolver.districtAt(lat, lng)

beforeAll(() => {
  resolver = DistrictResolver.fromGeoJson(
    JSON.parse(readFileSync(resolve(__dirname, '../../../../public/boundaries/distritos_piura.geojson'), 'utf8')),
  )
})

describe('which district a listing counts in', () => {
  const pins: [string, number, number, string, string][] = [
    ['stored CASTILLA', -5.173828605102582, -80.6090177988425, 'CASTILLA', 'Castilla'],
    ['stored 26 de Octubre', -5.172932152491974, -80.66152447705662, '26 de Octubre', 'Veintiséis de Octubre'],
    ['stored SULLANA', -4.9017039425070035, -80.67681907917549, 'SULLANA', 'Sullana'],
    ['stored Chato', -5.2820807, -80.6126124, 'Chato', 'Catacaos'],
    ['Plaza de Armas', -5.1945, -80.6328, 'Piura', 'Piura'],
    ['Máncora', -4.1053, -81.0476, 'Mancora', 'Máncora'],
  ]
  for (const [label, lat, lng, stored, expected] of pins) {
    it(`exact pin, ${label} → ${expected}`, () => {
      expect(districtNameFor(mapListing({ lat, lng, distrito: stored }), at)).toBe(expected)
    })
  }

  it('an exact pin wins over a wrong stored name', () => {
    expect(districtNameFor(mapListing({ lat: -5.173828605102582, lng: -80.6090177988425, distrito: 'Piura' }), at)).toBe('Castilla')
  })

  it('an approximate listing uses its cleaned stored name, never its moved pin', () => {
    expect(districtNameFor(mapListing({ exact: false, lat: -5.173828605102582, lng: -80.6090177988425, distrito: 'Piura ' }), at)).toBe('Piura')
  })

  for (const [stored, official] of [['CASTILLA', 'Castilla'], ['26 de Octubre', 'Veintiséis de Octubre'], ['Mancora ', 'Máncora']] as const) {
    it(`approximate, stored "${stored}" → ${official}`, () => {
      expect(districtNameFor(mapListing({ exact: false, distrito: stored }))).toBe(official)
    })
  }

  it('nothing matches → "Otros lugares", never dropped', () => {
    expect(districtNameFor(mapListing({ exact: false, distrito: 'Chato' }))).toBe(OTROS_LUGARES)
    expect(OTROS_LUGARES).toBe('Otros lugares')
  })

  it('an exact pin outside every outline falls back to the stored name', () => {
    expect(districtNameFor(mapListing({ lat: -5.2, lng: -82.0, distrito: 'Mancora' }), at)).toBe('Máncora')
  })
})

describe('groupByDistrict', () => {
  it('one group per district, counting every listing, biggest first', () => {
    const items = [
      mapListing({ id: 'c1', exact: false, distrito: 'Castilla' }),
      mapListing({ id: 'c2', exact: false, distrito: 'CASTILLA' }),
      mapListing({ id: 'c3', exact: false, distrito: 'Castilla ' }),
      mapListing({ id: 'p1', exact: false, distrito: 'Piura' }),
      mapListing({ id: 'x', exact: false, distrito: 'Chato' }),
    ]
    const groups = groupByDistrict(items)
    expect(new Set(groups.map((g) => g.name))).toEqual(new Set(['Castilla', 'Otros lugares', 'Piura']))
    expect(groups[0]!.name).toBe('Castilla')
    expect(groups[0]!.count).toBe(3)
    expect(groups.reduce((n, g) => n + g.count, 0)).toBe(items.length)
  })

  it('the card sits in the middle of its listings, and knows their extent', () => {
    const [g] = groupByDistrict([
      mapListing({ id: 'a', exact: false, distrito: 'Piura', lat: -5.2, lng: -80.7 }),
      mapListing({ id: 'b', exact: false, distrito: 'Piura', lat: -5.1, lng: -80.6 }),
    ])
    expect(g!.centroid.lat).toBeCloseTo(-5.15, 9)
    expect(g!.centroid.lng).toBeCloseTo(-80.65, 9)
    expect(g!.bounds.south).toBeCloseTo(-5.2, 9)
    expect(g!.bounds.east).toBeCloseTo(-80.6, 9)
    expect([...g!.listingIds].sort()).toEqual(['a', 'b'])
  })

  it('an empty map has no cards', () => {
    expect(groupByDistrict([])).toEqual([])
  })
})

describe('districtCountLine', () => {
  it('sale', () => expect(districtCountLine(22, true)).toBe('22 en venta'))
  it('rent', () => expect(districtCountLine(4, false)).toBe('4 en alquiler'))
})

describe('spreadPx — cards never overlap', () => {
  const overlap = (a: { x: number; y: number }, b: { x: number; y: number }, w: number, h: number) =>
    Math.abs(a.x - b.x) < w && Math.abs(a.y - b.y) < h
  it('two districts whose middles are close get pushed apart on screen', () => {
    const placed = spreadPx([{ x: 100, y: 100 }, { x: 110, y: 105 }], [{ w: 120, h: 48 }, { w: 120, h: 48 }])
    expect(overlap(placed[0]!, placed[1]!, 120, 48)).toBe(false)
  })
  it('cards of different sizes are kept apart by their real sizes', () => {
    const sizes = [{ w: 200, h: 50 }, { w: 90, h: 44 }, { w: 140, h: 48 }]
    const placed = spreadPx([{ x: 100, y: 100 }, { x: 120, y: 110 }, { x: 90, y: 95 }], sizes)
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++)
        expect(overlap(placed[i]!, placed[j]!, (sizes[i]!.w + sizes[j]!.w) / 2, (sizes[i]!.h + sizes[j]!.h) / 2), `${i} ${j}`).toBe(false)
  })
  it('districts far apart stay exactly where they are', () => {
    const anchors = [{ x: 0, y: 0 }, { x: 500, y: 500 }]
    expect(spreadPx(anchors, [{ w: 100, h: 40 }, { w: 100, h: 40 }])).toEqual(anchors)
  })
})
