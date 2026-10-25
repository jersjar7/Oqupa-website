// Ported from the app's test/services/config/peru_geography_find_district_test.dart
// (map plan step 1, ADR-031). Every spelling below was measured on production
// listings on 2026-10-24. The two apps must agree on every one.
import { describe, it, expect } from 'vitest'
import { findDistrict, normalizePlaceName } from '../peruGeography'
import { PIURA_DISTRICTS } from '../piuraDistricts'

describe('findDistrict — every spelling measured on production', () => {
  const cases: Record<string, [string, string]> = {
    Castilla: ['Castilla', 'Piura'],
    'Castilla ': ['Castilla', 'Piura'],
    CASTILLA: ['Castilla', 'Piura'],
    '26 de Octubre': ['Veintiséis de Octubre', 'Piura'],
    Mancora: ['Máncora', 'Talara'],
    'Mancora ': ['Máncora', 'Talara'],
    Máncora: ['Máncora', 'Talara'],
    Sullana: ['Sullana', 'Sullana'],
    sullana: ['Sullana', 'Sullana'],
    SULLANA: ['Sullana', 'Sullana'],
    'Sullana ': ['Sullana', 'Sullana'],
    'Miguel Checa ': ['Miguel Checa', 'Sullana'],
    Catacaos: ['Catacaos', 'Piura'],
    Chulucanas: ['Chulucanas', 'Morropón'],
    Piura: ['Piura', 'Piura'],
  }
  for (const [stored, [distrito, provincia]] of Object.entries(cases)) {
    it(`"${stored}" → ${distrito} (${provincia})`, () => {
      const d = findDistrict(stored)
      expect(d?.distrito).toBe(distrito)
      expect(d?.provincia).toBe(provincia)
    })
  }

  it('"Chato" is not a district — no match, never a guess', () => {
    expect(findDistrict('Chato')).toBeNull()
  })

  it('empty or blank names match nothing', () => {
    expect(findDistrict('')).toBeNull()
    expect(findDistrict('   ')).toBeNull()
    expect(findDistrict(null)).toBeNull()
    expect(findDistrict(undefined)).toBeNull()
  })

  it('the boundary source spells it "Tambo Grande"', () => {
    expect(findDistrict('Tambo Grande')?.distrito).toBe('Tambogrande')
  })

  it('"Veintiseis de Octubre" without the accent', () => {
    expect(findDistrict('Veintiseis de Octubre')?.distrito).toBe('Veintiséis de Octubre')
  })

  it('a district name shared by two provincias needs the provincia', () => {
    expect(findDistrict('Salitral')).toBeNull()
    expect(findDistrict('Salitral', 'SULLANA ')?.provincia).toBe('Sullana')
    expect(findDistrict('salitral', 'Morropon')?.provincia).toBe('Morropón')
  })

  it('a wrong provincia does not override an unambiguous district', () => {
    expect(findDistrict('CASTILLA', 'CASTILLA')?.provincia).toBe('Piura')
  })

  it('every official district finds itself', () => {
    for (const d of PIURA_DISTRICTS) {
      expect(findDistrict(d.distrito, d.provincia)).toBe(d)
    }
  })

  it('normalises capitals, spaces and accents', () => {
    expect(normalizePlaceName('  Morropón ')).toBe('morropon')
  })
})
