// ADR-060: one rule for how a person's name is saved, identical on the app
// (oqupa test/utils/person_name_test.dart), the Cloud Functions
// (oqupa functions/__tests__/person-name.test.js) and here. The table below is
// the same list, in the same order, in all three — change one, change all three.
import { describe, it, expect } from 'vitest'
import { normalizePersonName } from '../personName'

const SHARED_CASES: Array<[string, string]> = [
  ['pedro jose guerrero vinces', 'Pedro Jose Guerrero Vinces'],
  ['MARÍA DE LOS ÁNGELES', 'María de los Ángeles'],
  ["ana-lucía o'neil", "Ana-Lucía O'Neil"],
  ['  juan   pérez ', 'Juan Pérez'],
  ['de la cruz', 'De la Cruz'],
  ['McDonald', 'McDonald'],
  ['JOSÉ PÉREZ', 'José Pérez'],
  ['ñahui quispe', 'Ñahui Quispe'],
  ['Juan P. Pérez', 'Juan P. Pérez'],
  ['maría del carmen y josé', 'María del Carmen y José'],
  ['Ana De La Torre', 'Ana de la Torre'],
  ['pablo e isabel', 'Pablo e Isabel'],
  ['ludwig von mises', 'Ludwig von Mises'],
  ['DE LA CRUZ', 'De la Cruz'],
  ['JUAN o’neil', 'Juan O’Neil'],
  ['josé\tpérez', 'José Pérez'],
  ['JP morgan', 'Jp Morgan'],
  ['luis da silva di stefano van gogh', 'Luis da Silva di Stefano van Gogh'],
  ['las heras', 'Las Heras'],
  ['Carlos Las Casas', 'Carlos las Casas'],
  ['jOSÉ pÉREZ', 'José Pérez'],
  ["o'BRIEN", "O'Brien"],
  ['Juan E Pérez', 'Juan E Pérez'],
  ['PABLO E ISABEL', 'Pablo e Isabel'],
  ['Already Fine', 'Already Fine'],
  ['', ''],
  ['   ', ''],
]

describe('normalizePersonName — shared cases (ADR-060)', () => {
  it.each(SHARED_CASES)('%j → %j', (input, expected) => {
    expect(normalizePersonName(input)).toBe(expected)
  })

  it('applying the rule twice changes nothing', () => {
    for (const [input] of SHARED_CASES) {
      const once = normalizePersonName(input)
      expect(normalizePersonName(once)).toBe(once)
    }
  })

  it('anything that is not text comes back as ""', () => {
    expect(normalizePersonName(null)).toBe('')
    expect(normalizePersonName(undefined)).toBe('')
  })
})
