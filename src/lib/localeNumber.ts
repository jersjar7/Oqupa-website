/**
 * Reads a number the way people in Peru type it into the publish form.
 *
 * - A comma or a dot can be the decimal point: "120,5" and "120.5" are 120.5
 *   (the app reads the area the same way).
 * - Three digits after the LAST separator mean thousands: "1,500", "250,000",
 *   "1.500" are whole numbers — nobody means 250 when they type "250,000".
 * - Thousands and decimals together, either way round: "1,500.50", "1.500,50".
 * - A currency typed into the box ("S/", "US$", "$") is ignored.
 *
 * Returns `undefined` for an empty box and `NaN` for anything that is not a
 * number, so the form can say which of the two it is.
 */
export function parseLocaleNumber(raw: string): number | undefined {
  const text = raw.replace(/US\$|S\/|\$/gi, '').replace(/\s+/g, '')
  if (text === '') return undefined
  if (!/^[\d.,]+$/.test(text) || !/\d/.test(text)) return NaN

  const lastSep = Math.max(text.lastIndexOf(','), text.lastIndexOf('.'))
  if (lastSep === -1) return Number(text)

  const before = text.slice(0, lastSep)
  const after = text.slice(lastSep + 1)
  const integerDigits = before.replace(/[.,]/g, '')
  if (after.length === 3 && integerDigits !== '' && integerDigits !== '0') {
    // Thousands only.
    return Number(integerDigits + after)
  }
  if (after === '') return integerDigits === '' ? NaN : Number(integerDigits)
  return Number(`${integerDigits || '0'}.${after}`)
}

/**
 * A count box (dormitorios, baños, estacionamientos): `null` when empty, the
 * number otherwise — decimals kept as typed so the check can explain that a
 * whole number is needed, and `NaN` for letters.
 */
export function parseCount(raw: string): number | null {
  const n = parseLocaleNumber(raw)
  return n === undefined ? null : n
}
