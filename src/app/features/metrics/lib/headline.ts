// Pure helpers for the headline tiles at the top of Números (plan task A1b).
// "This week" is the 7 complete Lima days before today: the nightly job runs
// at 03:45 Lima, when today has barely started. The server's windows
// (dashboardSeries.headline) end on the same day.

import { sumBetween, type DailySeries } from './series'

const DAY_MS = 86_400_000
const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10)

export function weekWindow(today: string): { from: string; to: string } {
  return { from: addDays(today, -7), to: addDays(today, -1) }
}

/**
 * Contacts in the last 7 complete days, and the weekly average of the 28 days
 * before. No average when the contact log began after those 28 days started —
 * the missing weeks would read as zero.
 */
export function contactsThisWeek(
  contacts: DailySeries,
  today: string,
  logSince: string | null,
): { week: number; average: number | null } {
  const { from, to } = weekWindow(today)
  const before = { from: addDays(from, -28), to: addDays(from, -1) }
  const week = sumBetween(contacts, from, to)
  const average =
    logSince !== null && logSince <= before.from ? sumBetween(contacts, before.from, before.to) / 4 : null
  return { week, average }
}

/** Meta spend ÷ contacts, both over the last 7 complete days. */
export function costPerContactThisWeek(
  spendUSD: DailySeries,
  contacts: DailySeries,
  today: string,
): { spend: number; contacts: number; perContact: number | null } {
  const { from, to } = weekWindow(today)
  const spend = sumBetween(spendUSD, from, to)
  const count = sumBetween(contacts, from, to)
  return { spend, contacts: count, perContact: count > 0 ? spend / count : null }
}

/** Hours as a person would say them: hours under two days, days after. */
export function durationWords(hours: number | null): string {
  if (hours === null) return '—'
  if (hours < 1) return 'menos de 1 hora'
  if (hours < 48) {
    const h = Math.round(hours)
    return `${h} ${h === 1 ? 'hora' : 'horas'}`
  }
  const days = Math.round((hours / 24) * 10) / 10
  return `${days.toLocaleString('es-PE', { maximumFractionDigits: 1 })} días`
}

export function percent(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)} %` : '—'
}
