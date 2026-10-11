import { describe, it, expect } from 'vitest'
import { FIELD_BOX, LABEL_FIELD_WIDTH, URL_FIELD_WIDTH } from '../fieldStyles'

describe('fieldStyles', () => {
  describe('FIELD_BOX', () => {
    it('is a non-empty string', () => {
      expect(typeof FIELD_BOX).toBe('string')
      expect(FIELD_BOX.length).toBeGreaterThan(0)
    })

    it('includes border styling', () => {
      expect(FIELD_BOX).toContain('border')
    })

    it('includes focus ring styling', () => {
      expect(FIELD_BOX).toContain('focus:ring')
    })

    it('includes disabled opacity', () => {
      expect(FIELD_BOX).toContain('disabled:opacity')
    })

    it('includes placeholder text color', () => {
      expect(FIELD_BOX).toContain('placeholder:text-')
    })
  })

  describe('LABEL_FIELD_WIDTH', () => {
    it('is a non-empty string', () => {
      expect(typeof LABEL_FIELD_WIDTH).toBe('string')
      expect(LABEL_FIELD_WIDTH.length).toBeGreaterThan(0)
    })

    it('includes sm: responsive classes', () => {
      expect(LABEL_FIELD_WIDTH).toContain('sm:')
    })
  })

  describe('URL_FIELD_WIDTH', () => {
    it('is a non-empty string', () => {
      expect(typeof URL_FIELD_WIDTH).toBe('string')
      expect(URL_FIELD_WIDTH.length).toBeGreaterThan(0)
    })

    it('includes sm: responsive classes', () => {
      expect(URL_FIELD_WIDTH).toContain('sm:')
    })
  })
})
