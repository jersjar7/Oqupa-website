import { describe, it, expect } from 'vitest'
import { bestTimeText, changeText, moreDataText, noteText, openRate, shortDay, slotText } from '../words'

describe('Analítica words (ADR-058)', () => {
  it('days read the Peruvian way', () => {
    expect(shortDay('2026-11-05')).toBe('5 nov')
    expect(shortDay('2026-09-01')).toBe('1 set')
  })

  describe('"Necesitamos más datos"', () => {
    it('not recorded yet, and once recording started', () => {
      expect(moreDataText('places', { status: 'not-recorded' }))
        .toBe('Necesitamos más datos. Todavía no registramos dónde están las personas que miran.')
      expect(moreDataText('sources', { status: 'not-recorded', since: '2026-11-12' }))
        .toBe('Necesitamos más datos. Empezamos a registrar de dónde llega cada persona el 12 nov.')
    })
    it('too few, with how many there are and how many it needs', () => {
      expect(moreDataText('heat', { status: 'too-few', n: 7, min: 20 }))
        .toBe('Necesitamos más datos: hay 7 vistas y hacen falta al menos 20.')
      expect(moreDataText('zone', { status: 'too-few', n: 1, min: 5 }, 'Castilla'))
        .toBe('Necesitamos más datos: hay 1 propiedad parecida en Castilla y hacen falta al menos 5.')
      expect(moreDataText('daysToClose', { status: 'too-few', n: 0, min: 10 }))
        .toBe('Necesitamos más datos: hay 0 ventas o alquileres parecidos y hacen falta al menos 10.')
    })
    it('a contact rate without enough peers names the peers, not the vistas', () => {
      expect(moreDataText('contactRate', { status: 'too-few-peers', n: 2, min: 5 }, 'Piura'))
        .toBe('Necesitamos más datos: hay 2 propiedades parecidas en Piura y hacen falta al menos 5.')
    })
    it('a listing without m² is asked for them', () => {
      expect(moreDataText('zone', { status: 'needs-area' })).toBe('Agrega los m² de tu propiedad para compararla con la zona.')
    })
  })

  describe('changes against the period before', () => {
    it('up, down, same, and nothing to compare', () => {
      expect(changeText(124, 100)).toEqual({ text: '▲ 24%', up: true })
      expect(changeText(88, 100)).toEqual({ text: '▼ 12%', up: false })
      expect(changeText(5, 5)).toEqual({ text: 'igual', up: null })
      expect(changeText(5, null)).toBeNull()
      expect(changeText(null, 5)).toBeNull()
    })
    it('from zero is "nuevo", never an infinite percentage', () => {
      expect(changeText(3, 0)).toEqual({ text: '▲ nuevo', up: true })
    })
    it('a change that rounds to 0% reads "igual"', () => {
      expect(changeText(1001, 1000)).toEqual({ text: 'igual', up: null })
    })
  })

  it('open rate: one decimal, none without apariciones', () => {
    expect(openRate({ shown: 20042, seen: 2410 })).toBe(12)
    expect(openRate({ shown: 3, seen: 1 })).toBe(33.3)
    expect(openRate({ shown: 0, seen: 0 })).toBeNull()
  })

  it('hours read as people say them', () => {
    expect(slotText(10)).toBe('de 8 a 10 p. m.')
    expect(slotText(5)).toBe('de 10 a. m. a 12 p. m.')
    expect(slotText(0)).toBe('de 12 a 2 a. m.')
    expect(slotText(11)).toBe('de 10 p. m. a 12 a. m.')
    expect(bestTimeText({ day: 6, slot: 9 })).toBe('los domingos de 6 a 8 p. m.')
  })

  it('notes are facts, with la/lo by type', () => {
    expect(noteText({ kind: 'no-views', days: 7 }, 'departamento').text).toBe('Nadie lo abrió en 7 días')
    expect(noteText({ kind: 'no-views', days: 7 }, 'casa').text).toBe('Nadie la abrió en 7 días')
    expect(noteText({ kind: 'price-above', pct: 18 }, 'casa').text).toBe('Precio 18% sobre la mediana de la zona')
    expect(noteText({ kind: 'few-photos', photos: 1 }, 'casa').text).toBe('1 foto')
    expect(noteText({ kind: 'ok' }, 'casa')).toEqual({ text: 'Al día', tone: 'ok' })
  })
})
