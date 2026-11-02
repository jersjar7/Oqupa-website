import { describe, it, expect } from 'vitest'
import { PASSWORD_RULES, missingPasswordRules, passwordNeedsSentence } from '../passwordRules'

// ADR-046 #7: the rule is unchanged; it is written in words, the same on both apps.
describe('password rules in words', () => {
  it('names each rule in words, in order', () => {
    expect(PASSWORD_RULES.map((r) => r.label)).toEqual([
      '8 letras o más',
      'una mayúscula',
      'una minúscula',
      'un número',
      'un símbolo',
    ])
  })

  it('a strong password misses nothing, ñ and spaces included', () => {
    expect(missingPasswordRules('Contraseña 1!')).toEqual([])
    expect(passwordNeedsSentence('Contraseña 1!')).toBeNull()
  })

  it('0 counts as a number', () => {
    expect(missingPasswordRules('Abcdefg0!')).toEqual([])
  })

  it('names exactly what is missing', () => {
    expect(passwordNeedsSentence('abcdefg1')).toBe('Tu contraseña necesita una mayúscula y un símbolo.')
    expect(passwordNeedsSentence('abc')).toBe(
      'Tu contraseña necesita 8 letras o más, una mayúscula, un número y un símbolo.',
    )
    expect(passwordNeedsSentence('ABCDEFG1!')).toBe('Tu contraseña necesita una minúscula.')
  })
})
