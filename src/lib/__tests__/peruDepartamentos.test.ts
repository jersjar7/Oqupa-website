import { describe, it, expect } from 'vitest'
import { PERU_DEPARTAMENTOS_EXCEPT_PIURA } from '../peruDepartamentos'

describe('PERU_DEPARTAMENTOS_EXCEPT_PIURA', () => {
  it('is an array', () => {
    expect(Array.isArray(PERU_DEPARTAMENTOS_EXCEPT_PIURA)).toBe(true)
  })

  it('contains exactly 24 entries (25 minus Piura)', () => {
    // Peru has 24 departamentos + Callao (constitutional province) = 25 regions.
    // Piura is the launch market so it is excluded, leaving 24.
    expect(PERU_DEPARTAMENTOS_EXCEPT_PIURA).toHaveLength(24)
  })

  it('does NOT include Piura', () => {
    expect(PERU_DEPARTAMENTOS_EXCEPT_PIURA).not.toContain('Piura')
  })

  it('includes Lima', () => {
    expect(PERU_DEPARTAMENTOS_EXCEPT_PIURA).toContain('Lima')
  })

  it('includes Callao', () => {
    expect(PERU_DEPARTAMENTOS_EXCEPT_PIURA).toContain('Callao')
  })

  it('includes Arequipa', () => {
    expect(PERU_DEPARTAMENTOS_EXCEPT_PIURA).toContain('Arequipa')
  })

  it('includes Cusco', () => {
    expect(PERU_DEPARTAMENTOS_EXCEPT_PIURA).toContain('Cusco')
  })

  it('all entries are non-empty strings', () => {
    for (const dep of PERU_DEPARTAMENTOS_EXCEPT_PIURA) {
      expect(typeof dep).toBe('string')
      expect(dep.length).toBeGreaterThan(0)
    }
  })

  it('has no duplicate entries', () => {
    const unique = new Set(PERU_DEPARTAMENTOS_EXCEPT_PIURA)
    expect(unique.size).toBe(PERU_DEPARTAMENTOS_EXCEPT_PIURA.length)
  })

  it('is sorted alphabetically', () => {
    const sorted = [...PERU_DEPARTAMENTOS_EXCEPT_PIURA].sort((a, b) =>
      a.localeCompare(b, 'es'),
    )
    expect(PERU_DEPARTAMENTOS_EXCEPT_PIURA).toEqual(sorted)
  })
})
