// Pure helpers for the "Punto de control" tab on Números: three numbers,
// month by month, and whether each is growing. The months themselves are
// built nightly on the server (dashboardSeries/current.checkpoint).

/** One Lima month. null = no data for that number yet ("Sin datos"), never zero. */
export interface CheckpointMonth {
  month: string
  /** False for the month in progress. */
  complete: boolean
  activeListings: number | null
  newListings: number | null
  contacts: number | null
  returning: number | null
}

/** dashboardSeries/current.checkpoint — absent on documents built before 2026-11-01. */
export interface Checkpoint {
  checkpointDay: string
  currentMonth: string
  months: CheckpointMonth[]
  since: {
    activeListings: string | null
    newListings: string | null
    contacts: string | null
    /** 'YYYY-MM': the first month anyone could have come back. */
    returning: string | null
  }
}

export type CheckpointKey = 'activeListings' | 'contacts' | 'returning'

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

/** '2026-10' → 'octubre 2026'. */
export function monthName(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTHS[(m ?? 1) - 1]} ${y}`
}

/** '2027-02-28' → '28 de febrero de 2027'. */
export function checkpointDate(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return `${d} de ${MONTHS[(m ?? 1) - 1]} de ${y}`
}

export interface Change {
  direction: 'up' | 'down' | 'same'
  /** Whole percent; null when the month before was zero. */
  percent: number | null
}

export function monthChange(previous: number | null, value: number | null): Change | null {
  if (previous === null || value === null) return null
  if (value === previous) return { direction: 'same', percent: 0 }
  const direction = value > previous ? 'up' : 'down'
  if (previous === 0) return { direction, percent: null }
  return { direction, percent: Math.round((Math.abs(value - previous) / previous) * 100) }
}

export function changeWords(change: Change): string {
  if (change.direction === 'same') return '= igual'
  const arrow = change.direction === 'up' ? '▲' : '▼'
  return change.percent === null ? `${arrow} desde 0` : `${arrow} ${change.percent} %`
}

/**
 * The newest complete month that has the number, against the month right
 * before it. The month in progress is never compared: half a month against a
 * whole one always looks like a fall.
 */
export function latestComplete(
  months: CheckpointMonth[],
  key: CheckpointKey,
): { month: string; value: number; previousMonth: string | null; change: Change | null } | null {
  for (let i = months.length - 1; i >= 0; i--) {
    const row = months[i]!
    const value = row[key]
    if (!row.complete || value === null) continue
    const previous = i > 0 ? months[i - 1]! : null
    return {
      month: row.month,
      value,
      previousMonth: previous ? previous.month : null,
      change: previous ? monthChange(previous[key], value) : null,
    }
  }
  return null
}
