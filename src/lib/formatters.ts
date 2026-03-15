import { CURRENCY_SYMBOLS, RENTAL_DURATION_PRICE_SUFFIX } from '@/types/enums'
import type { Currency, RentalDurationType } from '@/types/enums'

export function formatShortPrice(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency]
  if (amount >= 1_000_000) {
    const value = amount / 1_000_000
    const formatted = value % 1 === 0 ? value.toString() : value.toFixed(1)
    return `${symbol} ${formatted}M`
  }
  if (amount >= 1_000) {
    const value = amount / 1_000
    const formatted = value % 1 === 0 ? value.toString() : value.toFixed(1)
    return `${symbol} ${formatted}K`
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
