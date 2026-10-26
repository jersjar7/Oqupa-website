// Ported from the app's test/services/infrastructure/map/district_resolver_test.dart.
// Runs against the real bundled outlines (public/boundaries/distritos_piura.geojson,
// the same file the app ships).
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { DistrictResolver } from '../districtResolver'
import { findDistrict } from '../peruGeography'
import { PIURA_DISTRICTS } from '../piuraDistricts'

const ASSET = resolve(__dirname, '../../../../public/boundaries/distritos_piura.geojson')
let raw = ''
let resolver: DistrictResolver

beforeAll(() => {
  raw = readFileSync(ASSET, 'utf8')
  resolver = DistrictResolver.fromGeoJson(JSON.parse(raw))
})

describe('DistrictResolver', () => {
  it('the asset carries its source and licence', () => {
    expect(raw).toContain('Instituto Geográfico Nacional')
    expect(raw).toContain('CC BY-IGO')
  })

  it('every official district has exactly one outline', () => {
    for (const d of PIURA_DISTRICTS) expect(resolver.outlineCountFor(d), d.distrito).toBe(1)
    expect(resolver.unmatchedOutlineNames).toEqual([])
  })

  describe('real production pins (2026-10-24)', () => {
    const pins: [string, number, number, string, string][] = [
      ['stored "CASTILLA"', -5.173828605102582, -80.6090177988425, 'Castilla', 'Piura'],
      ['stored "26 de Octubre"', -5.172932152491974, -80.66152447705662, 'Veintiséis de Octubre', 'Piura'],
      ['stored "SULLANA"', -4.9017039425070035, -80.67681907917549, 'Sullana', 'Sullana'],
      ['stored "Chato"', -5.2820807, -80.6126124, 'Catacaos', 'Piura'],
      ['Plaza de Armas', -5.1945, -80.6328, 'Piura', 'Piura'],
      ['Máncora town', -4.1053, -81.0476, 'Máncora', 'Talara'],
    ]
    for (const [label, lat, lng, distrito, provincia] of pins) {
      it(`${label} → ${distrito}`, () => {
        const d = resolver.districtAt(lat, lng)
        expect(d?.distrito).toBe(distrito)
        expect(d?.provincia).toBe(provincia)
      })
    }
  })

  it('the outlines win over Google ("Piura" for a Castilla pin)', () => {
    const d = resolver.districtForPin(-5.173828605102582, -80.6090177988425, 'Piura', 'Piura')
    expect(d?.distrito).toBe('Castilla')
  })

  it("outside every outline, Google's name is used if it is an official district", () => {
    expect(resolver.districtForPin(-5.2, -82.0, 'Mancora', 'Talara')?.distrito).toBe('Máncora')
  })

  it('outside every outline and no official name from Google: null, the owner chooses', () => {
    expect(resolver.districtForPin(-5.2, -82.0, 'Chato', 'Piura Province')).toBeNull()
    expect(resolver.districtForPin(-5.2, -82.0)).toBeNull()
  })

  it('a point outside the departamento has no district', () => {
    expect(resolver.districtAt(-12.0464, -77.0428)).toBeNull() // Lima
    expect(resolver.districtAt(-5.2, -82.0)).toBeNull() // the sea
  })

  it('returns the official district object, with official spelling', () => {
    expect(resolver.districtAt(-5.172932152491974, -80.66152447705662)).toBe(
      findDistrict('Veintiséis de Octubre'),
    )
  })

  it('an outline named something that is not an official district is reported', () => {
    const r = DistrictResolver.fromGeoJson({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: { distrito: 'Atlantis', provincia: 'Piura' },
        geometry: { type: 'Polygon', coordinates: [[[-80, -5], [-79, -5], [-79, -4], [-80, -4], [-80, -5]]] } }],
    })
    expect(r.unmatchedOutlineNames).toEqual(['Atlantis'])
    expect(r.districtAt(-4.5, -79.5)).toBeNull()
  })

  it('a hole in an outline is outside it', () => {
    const r = DistrictResolver.fromGeoJson({
      type: 'FeatureCollection',
      features: [{ type: 'Feature', properties: { distrito: 'Piura', provincia: 'Piura' },
        geometry: { type: 'Polygon', coordinates: [
          [[-81, -6], [-80, -6], [-80, -5], [-81, -5], [-81, -6]],
          [[-80.6, -5.6], [-80.4, -5.6], [-80.4, -5.4], [-80.6, -5.4], [-80.6, -5.6]],
        ] } }],
    })
    expect(r.districtAt(-5.8, -80.8)?.distrito).toBe('Piura')
    expect(r.districtAt(-5.5, -80.5)).toBeNull()
  })
})
