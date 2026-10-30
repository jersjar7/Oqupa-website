// Ported from the app's test/services/infrastructure/map/map_pin_label_test.dart
// (map plan step 2, ADR-031): every pin says what the property is and its price.
import { describe, it, expect } from 'vitest'
import { pinLabelFor, pinKindWord, PIN_KINDS } from '../pinLabel'
import { mapListing } from './mapListingFixture'
import type { PropertyType } from '@/types/enums'

describe('pinLabelFor', () => {
  const words: Record<PropertyType, string> = {
    casa: 'CASA', departamento: 'DEPARTAMENTO', terreno: 'TERRENO', oficina: 'OFICINA',
    local: 'LOCAL', hospedaje: 'ALOJAMIENTO', habitacion: 'CUARTO',
  }
  for (const [type, word] of Object.entries(words)) {
    it(`${type} reads ${word}`, () => {
      const label = pinLabelFor(mapListing({ type: type as PropertyType, area: 0 }))
      expect(label.typeLine).toBe(word)
      expect(PIN_KINDS).toContain(label.kind)
      expect(pinKindWord(label.kind)).toBe(word)
    })
  }

  it('"TERRENO · 300 m²"', () => {
    const label = pinLabelFor(mapListing({ type: 'terreno', area: 300 }))
    expect(label.typeLine).toBe('TERRENO · 300 m²')
    expect(label.kind).toBe('terreno')
  })
  it('thousands get a separator: "TERRENO · 1,250 m²"', () => {
    expect(pinLabelFor(mapListing({ type: 'terreno', area: 1250 })).typeLine).toBe('TERRENO · 1,250 m²')
  })
  it('a fractional size is rounded to whole metres', () => {
    expect(pinLabelFor(mapListing({ type: 'terreno', area: 300.6 })).typeLine).toBe('TERRENO · 301 m²')
  })
  it('other types never show the size on the pin', () => {
    expect(pinLabelFor(mapListing({ type: 'casa', area: 300 })).typeLine).toBe('CASA')
  })

  it('sale: the compact Spanish form', () => {
    expect(pinLabelFor(mapListing({ amount: 98000, currency: 'USD' })).priceLine).toBe('US$ 98 mil')
  })
  it('long-term rent: the full amount "al mes"', () => {
    const p = pinLabelFor(mapListing({ operation: 'alquiler', rental: 'longTerm', amount: 1200, currency: 'PEN' })).priceLine
    expect(p.endsWith(' al mes')).toBe(true)
    expect(p).toContain('1,200')
    expect(p).not.toContain('/mes')
  })
  it('rent without a duration is monthly', () => {
    expect(pinLabelFor(mapListing({ operation: 'alquiler', amount: 900, currency: 'PEN' })).priceLine).toBe('S/. 900 al mes')
  })
  it('short-term rent: "la noche"', () => {
    const p = pinLabelFor(mapListing({ operation: 'alquiler', rental: 'shortTerm', amount: 120, currency: 'PEN', type: 'hospedaje' })).priceLine
    expect(p).toBe('S/. 120 la noche')
  })
})
