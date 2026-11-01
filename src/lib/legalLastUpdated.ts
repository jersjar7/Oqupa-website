// Spanish "Última actualización" dates for the legal pages. The dates
// themselves are computed from git at build time (scripts/legalLastUpdated.ts)
// and injected by vite.config.ts.

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** '2026-11-01' → '1 de noviembre de 2026' */
export function formatSpanishDate(isoDay: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDay)
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined
  if (!match || !month) throw new Error(`Not a YYYY-MM-DD date: ${isoDay}`)
  return `${Number(match[3])} de ${month} de ${match[1]}`
}

export const privacyLastUpdated = formatSpanishDate(__LEGAL_LAST_UPDATED__.privacy)
export const termsLastUpdated = formatSpanishDate(__LEGAL_LAST_UPDATED__.terms)
