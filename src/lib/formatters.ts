import { CURRENCY_SYMBOLS, RENTAL_DURATION_PRICE_SUFFIX } from '@/types/enums'
import type { Currency, RentalDurationType } from '@/types/enums'

/**
 * Compact price for a map pin, in Spanish.
 *
 * Examples: `S/ 540 mil`, `US$ 300 mil`, `S/ 1.2 millones`, `S/ 850`
 *
 * WHY NOT "K" AND "M". This used to render `S/ 540K`. Users in Peru read the K
 * as **kilómetros** — real feedback, 2026-08-03 — and the currency symbol right
 * next to it was not enough to prevent it. 47 of the 50 production listings sit
 * in this band, so the ambiguity was on nearly every sale pin.
 *
 * "mil" is how the price is actually spoken in Peru, and it costs nothing:
 * `540 mil` and `540,000` are the same width, so the compact form was never
 * buying space over the full number anyway.
 *
 * Millions are written out rather than abbreviated to "M", which has the same
 * failure mode as "K" — in Spanish it also reads as *metros*.
 *
 * MUST STAY IDENTICAL to PriceFormatter.formatForMapBubble in the Flutter app.
 */
export function formatShortPrice(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency]
  if (amount >= 1_000_000) {
    const value = amount / 1_000_000
    const formatted = value % 1 === 0 ? value.toString() : value.toFixed(1)
    return `${symbol} ${formatted} ${value === 1 ? 'millón' : 'millones'}`
  }
  if (amount >= 1_000) {
    return `${symbol} ${Math.round(amount / 1_000)} mil`
  }
  return `${symbol} ${amount}`
}

/** Returns the price period suffix for alquiler listings, e.g. "/mes" or "/noche" */
export function getPriceSuffix(
  operationType: string,
  rentalDurationType?: RentalDurationType
): string {
  if (operationType !== 'alquiler') return ''
  // Backward compat: old docs without rentalDurationType default to longTerm (/mes)
  const key = rentalDurationType || 'longTerm'
  return RENTAL_DURATION_PRICE_SUFFIX[key] ?? '/mes'
}
