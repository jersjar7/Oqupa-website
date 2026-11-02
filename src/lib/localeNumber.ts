/**
 * Reads a number the way people in Peru type it into the publish form — the
 * same strict rule as the app (ADR-043 step 3, hostile review 2026-11-02):
 *
 * - Digits, with at most one decimal separator (a comma or a dot).
 * - One or two digits after the last separator are decimals: "120,5",
 *   "120.75", "1,500.50", "1.500,50".
 * - Thousands only in properly grouped form: "1,500", "1.500", "1,500,000",
 *   "250.000" — groups of exactly three digits after a first group of one to
 *   three.
 * - Anything else ("12,345,6", "1,2,3", "1.5.0", "1,0000") is MALFORMED: the
 *   form says "Revisa el número: tiene un punto o una coma de más."
 * - A currency typed into the box ("S/.", "S/", "US$", "$") is ignored —
 *   its dot included, so "S/. 800" is 800, not 0.80.
 *
 * Returns `undefined` for an empty box, `NaN` for letters, MALFORMED_NUMBER
 * for misplaced separators, so the form can say which it is.
 */
export const MALFORMED_NUMBER: unique symbol = Symbol('malformed-number')
export type ParsedNumber = number | undefined | typeof MALFORMED_NUMBER

export function parseLocaleNumber(raw: string): ParsedNumber {
  const text = raw.replace(/US\$|S\/\.?|\$/gi, '').replace(/\s+/g, '')
  if (text === '') return undefined
  if (!/^[\d.,]+$/.test(text) || !/\d/.test(text)) return NaN

  const parts = text.split(/[.,]/)
  const seps = text.replace(/\d/g, '')
  if (seps === '') return Number(text)
  if (parts.some((p) => p === '')) return MALFORMED_NUMBER

  const last = parts[parts.length - 1]!
  const lastSep = seps[seps.length - 1]!
  const grouped = (groups: string[]) =>
    /^[1-9]\d{0,2}$/.test(groups[0]!) && groups.slice(1).every((g) => /^\d{3}$/.test(g))

  // All separators are thousands: "1,500", "1.500.000".
  if (last.length === 3 && new Set(seps).size === 1 && grouped(parts)) {
    return Number(parts.join(''))
  }
  // The last separator is the decimal point; any before it are thousands of
  // the OTHER kind: "120,5", "1,500.50", "1.500,50".
  if (last.length >= 1 && last.length <= 2) {
    const integerParts = parts.slice(0, -1)
    const thousandSeps = seps.slice(0, -1)
    if (thousandSeps.includes(lastSep)) return MALFORMED_NUMBER
    if (integerParts.length > 1 && !grouped(integerParts)) return MALFORMED_NUMBER
    return Number(`${integerParts.join('')}.${last}`)
  }
  return MALFORMED_NUMBER
}

/**
 * A count box (dormitorios, baños, estacionamientos): `null` when empty, the
 * number otherwise — decimals kept as typed so the check can explain that a
 * whole number is needed — `NaN` for letters, MALFORMED_NUMBER for misplaced
 * separators.
 */
export function parseCount(raw: string): number | null | typeof MALFORMED_NUMBER {
  const n = parseLocaleNumber(raw)
  return n === undefined ? null : n
}
