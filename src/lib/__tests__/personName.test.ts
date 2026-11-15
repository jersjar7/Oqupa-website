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
  ['JP morgan', 'JP Morgan'],
  ['luis da silva di stefano van gogh', 'Luis da Silva di Stefano van Gogh'],
  ['las heras', 'Las Heras'],
  ['Carlos Las Casas', 'Carlos las Casas'],
  ['jOSÉ pÉREZ', 'José Pérez'],
  ["o'BRIEN", "O'Brien"],
  ['Juan E. Pérez', 'Juan E. Pérez'],
  ['María Del Carmen Y José', 'María del Carmen y José'],
  ['Pablo E Isabel', 'Pablo e Isabel'],
  ['PABLO E ISABEL', 'Pablo e Isabel'],
  ['josé-MARÍA', 'José-María'],
  ['JOSÉ-maría', 'José-María'],
  ['ANA LÓPEZ', 'Ana López'],
  ['CLAUDE QA', 'Claude Qa'],
  ['Claude QA', 'Claude QA'],
  ['Juan JC Pérez', 'Juan JC Pérez'],
  ['Luis III', 'Luis III'],
  ['Inmobiliaria SAC', 'Inmobiliaria SAC'],
  ['juan PÉREZ', 'Juan Pérez'],
  ['Ana-LU torres', 'Ana-LU Torres'],
  ['qA pérez', 'Qa Pérez'],
  ['DEL Castillo ana', 'Del Castillo Ana'],
  ['LA Torre juan', 'La Torre Juan'],
  ['Rosa PAZ', 'Rosa Paz'],
  ['maria LUZ', 'Maria Luz'],
  ['ANA lópez', 'Ana López'],
  ['Rosa PAZ-ROJAS', 'Rosa Paz-Rojas'],
  ['Juan VIII', 'Juan Viii'],
  ['Inmobiliaria sac', 'Inmobiliaria Sac'], // changed with Jerson's yes, "Protect surnames" (2026-11-14)
  ['INMOBILIARIA SAC', 'Inmobiliaria SAC'],
  ['Inmobiliaria S.A.C.', 'Inmobiliaria S.A.C.'],
  ['Constructora Srl', 'Constructora Srl'], // changed with Jerson's yes, "Protect surnames" (2026-11-14)
  ['Juan Pérez EIRL', 'Juan Pérez EIRL'],
  ['LUIS III', 'Luis III'],
  ['Pedro iv', 'Pedro IV'],
  ['Carlos ii', 'Carlos II'],
  ['JUAN J.C. PEREZ', 'Juan J.C. Perez'],
  ['j.c. perez', 'J.C. Perez'],
  ['Juan j.c. Pérez', 'Juan J.C. Pérez'],
  ['Empresa sa', 'Empresa Sa'], // changed with Jerson's yes, "Protect surnames" (2026-11-14)
  ['EMPRESA S.A.A.', 'Empresa S.A.A.'],
  ['Minera saa', 'Minera Saa'], // changed with Jerson's yes, "Protect surnames" (2026-11-14)
  ['Transportes scrl', 'Transportes Scrl'], // changed with Jerson's yes, "Protect surnames" (2026-11-14)
  ['Inversiones S.C.R.L.', 'Inversiones S.C.R.L.'],
  ['McDONALD pérez', 'McDONALD Pérez'],
  ['Juan Saa Pérez', 'Juan Saa Pérez'],
  ['Rosa Sa', 'Rosa Sa'],
  ['Juan Sac', 'Juan Sac'],
  ['Ana-Saa', 'Ana-Saa'],
  ['Ana-SAA', 'Ana-SAA'],
  ['INVERSIONES SAC', 'Inversiones SAC'],
  ['Inversiones SAC', 'Inversiones SAC'],
  ['inversiones s.a.c.', 'Inversiones S.A.C.'],
  ['INVERSIONES PIURA SAC', 'Inversiones Piura SAC'],
  ['JUAN SAA PEREZ', 'Juan Saa Perez'],
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
