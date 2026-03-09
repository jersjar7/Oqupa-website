import { CURRENCY_SYMBOLS } from '@/types/enums'
import type { Currency } from '@/types/enums'

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
