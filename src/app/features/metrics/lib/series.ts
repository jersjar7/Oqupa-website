// Pure helpers for the tabbed Números page. A series is a map of Lima calendar
// days ('YYYY-MM-DD') to a number, as written by the buildDashboardSeries
// Cloud Function. Missing days mean zero.

export type DailySeries = Record<string, number>
export type RangeKey = '7' | '30' | '90' | 'all'
/** sum: add the days up · avg: per-day average · level: the value on the last day */
export type SeriesKind = 'sum' | 'avg' | 'level'

export interface Point {
  day: string
  value: number | null
}

export interface Stat {
  value: number | null
  /** The same measure over the equal-length period just before, or null (all time / no data then). */
  previous: number | null
}

const DAY_MS = 86_400_000

const toTime = (day: string) => Date.parse(`${day}T00:00:00Z`)
const toDay = (time: number) => new Date(time).toISOString().slice(0, 10)
const addDays = (day: string, n: number) => toDay(toTime(day) + n * DAY_MS)
const daysBetween = (from: string, to: string) => Math.round((toTime(to) - toTime(from)) / DAY_MS) + 1

export function firstDay(series: DailySeries): string | null {
  const days = Object.keys(series).sort()
  return days[0] ?? null
}

export interface Bounds {
  start: string
  end: string
  length: number
  previousStart: string
  previousEnd: string
}

/** The days a range covers, ending today. "all" starts at the series' first day. */
export function rangeBounds(range: RangeKey, today: string, series: DailySeries): Bounds {
  const start = range === 'all' ? (firstDay(series) ?? today) : addDays(today, -(Number(range) - 1))
  const length = daysBetween(start, today)
  return {
    start,
    end: today,
    length,
    previousStart: addDays(start, -length),
    previousEnd: addDays(start, -1),
  }
}

export function sumBetween(series: DailySeries, from: string, to: string): number {
  let total = 0
  for (const [day, value] of Object.entries(series)) {
    if (day >= from && day <= to) total += value
  }
  return total
}

/** Last recorded value on or before a day (for level series like active listings). */
export function levelAt(series: DailySeries, day: string): number | null {
  let best: string | null = null
  for (const d of Object.keys(series)) {
    if (d <= day && (best === null || d > best)) best = d
  }
  return best === null ? null : (series[best] ?? null)
}

/**
 * Days in [from, to] that the series actually covers. An average must not be
 * diluted by the weeks before a source existed (Analytics starts in August).
 */
function coveredDays(series: DailySeries, from: string, to: string): number {
  const first = firstDay(series)
  if (first === null || first > to) return 0
  return daysBetween(from > first ? from : first, to)
}

export function rangeStat(series: DailySeries, kind: SeriesKind, range: RangeKey, today: string): Stat {
  const b = rangeBounds(range, today, series)
  const hasPrevious = range !== 'all'
  if (kind === 'level') {
    return {
      value: levelAt(series, b.end),
      previous: hasPrevious ? levelAt(series, b.previousEnd) : null,
    }
  }
  const value = sumBetween(series, b.start, b.end)
  const previous = hasPrevious ? sumBetween(series, b.previousStart, b.previousEnd) : null
  if (kind === 'sum') {
    const prevCovered = hasPrevious ? coveredDays(series, b.previousStart, b.previousEnd) : 0
    return { value, previous: prevCovered > 0 ? previous : null }
  }
  const covered = coveredDays(series, b.start, b.end)
  const prevCovered = hasPrevious ? coveredDays(series, b.previousStart, b.previousEnd) : 0
  return {
    value: covered > 0 ? value / covered : null,
    previous: prevCovered > 0 && previous !== null ? previous / prevCovered : null,
  }
}

/**
 * Points for the line. 7 and 30 days plot each day; 90 days and all time plot
 * weeks (the week ending on each point), so a long line stays readable.
 */
export function rangePoints(series: DailySeries, kind: SeriesKind, range: RangeKey, today: string): {
  points: Point[]
  bucketDays: number
} {
  const b = rangeBounds(range, today, series)
  const bucketDays = range === '7' || range === '30' ? 1 : 7
  const count = Math.max(1, Math.ceil(b.length / bucketDays))
  const first = firstDay(series)
  const points: Point[] = []
  for (let i = count - 1; i >= 0; i--) {
    const day = addDays(b.end, -i * bucketDays)
    const from = addDays(day, -(bucketDays - 1))
    let value: number | null
    if (kind === 'level') value = levelAt(series, day)
    else if (first === null || day < first) value = null
    else if (kind === 'sum') value = sumBetween(series, from, day)
    else {
      const covered = coveredDays(series, from, day)
      value = covered > 0 ? sumBetween(series, from, day) / covered : null
    }
    points.push({ day, value })
  }
  return { points, bucketDays }
}

/** Add several series together (installs from Facebook + Instagram, say). */
export function addSeries(...all: DailySeries[]): DailySeries {
  const out: DailySeries = {}
  for (const s of all) for (const [d, v] of Object.entries(s)) out[d] = (out[d] ?? 0) + v
  return out
}

/** Count rows by a key, largest first. Rows whose key is null are skipped. */
export function rankBy<T>(rows: T[], key: (row: T) => string | null): Array<[string, number]> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const k = key(row)
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** '2026-10-11' → '11 oct' */
export function shortDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`)
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`
}

export function inRange(day: string | null, range: RangeKey, today: string): boolean {
  if (range === 'all') return true
  if (!day) return false
  return day >= addDays(today, -(Number(range) - 1)) && day <= today
}
