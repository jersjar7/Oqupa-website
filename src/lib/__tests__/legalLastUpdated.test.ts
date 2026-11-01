import { describe, expect, it } from 'vitest'
import { formatSpanishDate, privacyLastUpdated, termsLastUpdated } from '../legalLastUpdated'

describe('formatSpanishDate', () => {
  it('writes the date the way the legal pages say it', () => {
    expect(formatSpanishDate('2026-11-01')).toBe('1 de noviembre de 2026')
    expect(formatSpanishDate('2026-04-28')).toBe('28 de abril de 2026')
    expect(formatSpanishDate('2027-09-05')).toBe('5 de septiembre de 2027')
  })

  it('refuses anything that is not a YYYY-MM-DD day', () => {
    expect(() => formatSpanishDate('2026-13-01')).toThrow()
    expect(() => formatSpanishDate('1 de noviembre')).toThrow()
  })
})

describe('the injected dates', () => {
  it('match what git says, formatted in Spanish', () => {
    expect(privacyLastUpdated).toBe(formatSpanishDate(__LEGAL_LAST_UPDATED__.privacy))
    expect(termsLastUpdated).toBe(formatSpanishDate(__LEGAL_LAST_UPDATED__.terms))
  })
})
