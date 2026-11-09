import { describe, it, expect } from 'vitest'
import { veces, openedPhrase, shownPhrase, openedTotalPhrase, shownTotalPhrase } from '../countWords'

// Jerson 2026-11-07: "Apariciones" → "Se mostró", "Vistas" → "La abrieron".
// Always digits, never number words; 0 stays 0 (ADR-053).
describe('countWords', () => {
  it('veces: singular is "vez", everything else "veces", in digits', () => {
    expect(veces(1)).toBe('1 vez')
    expect(veces(0)).toBe('0 veces')
    expect(veces(12)).toBe('12 veces')
    expect(veces(1500)).toBe('1500 veces')
  })

  it('La abrieron for casa and oficina', () => {
    expect(openedPhrase(12, 'casa')).toBe('La abrieron 12 veces')
    expect(openedPhrase(1, 'oficina')).toBe('La abrieron 1 vez')
  })

  it('Lo abrieron for departamento, terreno, local, alojamiento, cuarto', () => {
    for (const t of ['departamento', 'terreno', 'local', 'hospedaje', 'habitacion']) {
      expect(openedPhrase(3, t)).toBe('Lo abrieron 3 veces')
    }
  })

  it('unknown type reads "La"', () => {
    expect(openedPhrase(2)).toBe('La abrieron 2 veces')
    expect(openedPhrase(2, 'otro')).toBe('La abrieron 2 veces')
  })

  it('zero stays zero', () => {
    expect(openedPhrase(0, 'casa')).toBe('La abrieron 0 veces')
    expect(shownPhrase(0)).toBe('Se mostró 0 veces')
  })

  it('Se mostró for one listing', () => {
    expect(shownPhrase(16)).toBe('Se mostró 16 veces')
    expect(shownPhrase(1)).toBe('Se mostró 1 vez')
  })

  it('totals across listings are plural', () => {
    expect(openedTotalPhrase(23)).toBe('Las abrieron 23 veces')
    expect(shownTotalPhrase(85)).toBe('Se mostraron 85 veces')
    expect(shownTotalPhrase(1)).toBe('Se mostraron 1 vez')
  })
})
