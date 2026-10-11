import { describe, it, expect } from 'vitest'
import { realtorApplicationSchema } from '../realtorApplicationSchema'

// ---------------------------------------------------------------------------
// Valid baseline
// ---------------------------------------------------------------------------

const VALID = {
  yearsExperience: 5,
  serviceZones: 'Piura, Castilla',
  motivation: 'Me encanta ayudar a las personas a encontrar su hogar ideal en Piura.',
}

describe('realtorApplicationSchema', () => {
  describe('valid input', () => {
    it('parses a fully valid payload', () => {
      expect(() => realtorApplicationSchema.parse(VALID)).not.toThrow()
    })

    it('accepts an optional businessName', () => {
      expect(() => realtorApplicationSchema.parse({ ...VALID, businessName: 'Mi Inmobiliaria' })).not.toThrow()
    })

    it('accepts an empty string for businessName', () => {
      expect(() => realtorApplicationSchema.parse({ ...VALID, businessName: '' })).not.toThrow()
    })

    it('accepts 0 years of experience', () => {
      expect(() => realtorApplicationSchema.parse({ ...VALID, yearsExperience: 0 })).not.toThrow()
    })

    it('accepts exactly 50 years of experience', () => {
      expect(() => realtorApplicationSchema.parse({ ...VALID, yearsExperience: 50 })).not.toThrow()
    })

    it('accepts motivation exactly at 20 characters', () => {
      const motivation = 'a'.repeat(20)
      expect(() => realtorApplicationSchema.parse({ ...VALID, motivation })).not.toThrow()
    })

    it('accepts motivation exactly at 500 characters', () => {
      const motivation = 'a'.repeat(500)
      expect(() => realtorApplicationSchema.parse({ ...VALID, motivation })).not.toThrow()
    })
  })

  describe('yearsExperience validation', () => {
    it('rejects negative years', () => {
      const result = realtorApplicationSchema.safeParse({ ...VALID, yearsExperience: -1 })
      expect(result.success).toBe(false)
    })

    it('rejects years greater than 50', () => {
      const result = realtorApplicationSchema.safeParse({ ...VALID, yearsExperience: 51 })
      expect(result.success).toBe(false)
    })

    it('rejects non-integer years', () => {
      const result = realtorApplicationSchema.safeParse({ ...VALID, yearsExperience: 5.5 })
      expect(result.success).toBe(false)
    })

    it('rejects a string where a number is expected', () => {
      const result = realtorApplicationSchema.safeParse({ ...VALID, yearsExperience: 'five' })
      expect(result.success).toBe(false)
    })
  })

  describe('serviceZones validation', () => {
    it('rejects an empty service zones string', () => {
      const result = realtorApplicationSchema.safeParse({ ...VALID, serviceZones: '' })
      expect(result.success).toBe(false)
    })

    it('accepts a single character service zone', () => {
      expect(() => realtorApplicationSchema.parse({ ...VALID, serviceZones: 'P' })).not.toThrow()
    })
  })

  describe('motivation validation', () => {
    it('rejects motivation shorter than 20 characters', () => {
      const result = realtorApplicationSchema.safeParse({ ...VALID, motivation: 'Short' })
      expect(result.success).toBe(false)
    })

    it('rejects motivation longer than 500 characters', () => {
      const result = realtorApplicationSchema.safeParse({ ...VALID, motivation: 'a'.repeat(501) })
      expect(result.success).toBe(false)
    })
  })

  describe('businessName validation', () => {
    it('rejects businessName longer than 100 characters', () => {
      const result = realtorApplicationSchema.safeParse({
        ...VALID, businessName: 'b'.repeat(101),
      })
      expect(result.success).toBe(false)
    })

    it('accepts businessName exactly 100 characters', () => {
      expect(() => realtorApplicationSchema.parse({
        ...VALID, businessName: 'b'.repeat(100),
      })).not.toThrow()
    })

    it('accepts omitted businessName (optional field)', () => {
      const { businessName: _ignored, ...noBusinessName } = { ...VALID, businessName: undefined }
      expect(() => realtorApplicationSchema.parse(noBusinessName)).not.toThrow()
    })
  })
})
