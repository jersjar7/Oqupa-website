import { describe, it, expect } from 'vitest'
import { realtorApplicationSchema, EXPERIENCE_RANGES } from '../realtorApplicationSchema'

// One application form with the app (ADR-046 #19): experience is one of the
// app's ranges (stored as its representative number of years, as the app
// stores it), districts are a list picked from the official names — no typed,
// comma-separated zones — and there is no business name.

const VALID = {
  yearsExperience: 7,
  serviceZones: ['Piura', 'Castilla'],
  motivation: 'Me encanta ayudar a las personas a encontrar su hogar ideal en Piura.',
}

describe('realtorApplicationSchema', () => {
  describe('valid input', () => {
    it('parses a fully valid payload', () => {
      expect(() => realtorApplicationSchema.parse(VALID)).not.toThrow()
    })

    it('accepts motivation exactly at 20 characters', () => {
      expect(() => realtorApplicationSchema.parse({ ...VALID, motivation: 'a'.repeat(20) })).not.toThrow()
    })

    it('accepts motivation exactly at 500 characters', () => {
      expect(() => realtorApplicationSchema.parse({ ...VALID, motivation: 'a'.repeat(500) })).not.toThrow()
    })
  })

  describe('experience ranges (the app\'s)', () => {
    it('are the app buckets with the app values', () => {
      expect(EXPERIENCE_RANGES).toEqual([
        { label: 'Menos de 1 año', years: 0 },
        { label: '1 – 3 años', years: 2 },
        { label: '3 – 5 años', years: 4 },
        { label: '5 – 10 años', years: 7 },
        { label: 'Más de 10 años', years: 12 },
      ])
    })

    it.each([0, 2, 4, 7, 12])('accepts %i', (years) => {
      expect(realtorApplicationSchema.safeParse({ ...VALID, yearsExperience: years }).success).toBe(true)
    })

    it('rejects a value that is not a range', () => {
      expect(realtorApplicationSchema.safeParse({ ...VALID, yearsExperience: 5 }).success).toBe(false)
    })

    it('asks for a range when none is chosen', () => {
      const result = realtorApplicationSchema.safeParse({ ...VALID, yearsExperience: undefined })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe('Elige cuántos años llevas como agente.')
    })
  })

  describe('districts', () => {
    it('asks for at least one', () => {
      const result = realtorApplicationSchema.safeParse({ ...VALID, serviceZones: [] })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]?.message).toBe('Elige al menos un distrito.')
    })

    it('rejects a name that is not an official Piura district', () => {
      expect(realtorApplicationSchema.safeParse({ ...VALID, serviceZones: ['Piura', 'Castila'] }).success).toBe(false)
    })
  })

  describe('motivation validation', () => {
    it('rejects motivation shorter than 20 characters', () => {
      expect(realtorApplicationSchema.safeParse({ ...VALID, motivation: 'Short' }).success).toBe(false)
    })

    it('rejects motivation longer than 500 characters', () => {
      expect(realtorApplicationSchema.safeParse({ ...VALID, motivation: 'a'.repeat(501) }).success).toBe(false)
    })
  })
})
