import { describe, it, expect } from 'vitest'
import {
  rangeBounds,
  rangeStat,
  rangePoints,
  levelAt,
  addSeries,
  rankBy,
  shortDay,
  inRange,
} from '../series'

const TODAY = '2026-10-11'

describe('rangeBounds', () => {
  it('covers the last N days ending today, and the N days before that', () => {
    expect(rangeBounds('7', TODAY, {})).toEqual({
      start: '2026-10-05',
      end: TODAY,
      length: 7,
      previousStart: '2026-09-28',
      previousEnd: '2026-10-04',
    })
  })

  it('starts "all" at the first day the series has data', () => {
    expect(rangeBounds('all', TODAY, { '2026-08-14': 1, '2026-09-01': 2 }).start).toBe('2026-08-14')
  })
})

describe('rangeStat', () => {
  const contacts = { '2026-10-09': 3, '2026-10-01': 1, '2026-09-25': 1 }

  it('adds up the period and the period before', () => {
    expect(rangeStat(contacts, 'sum', '7', TODAY)).toEqual({ value: 3, previous: 1 })
  })

  it('has no comparison for all time', () => {
    expect(rangeStat(contacts, 'sum', 'all', TODAY)).toEqual({ value: 5, previous: null })
  })

  it('has no comparison when the source did not exist in the previous period', () => {
    const series = { '2026-10-08': 2 }
    expect(rangeStat(series, 'sum', '7', TODAY).previous).toBeNull()
  })

  it('averages only over days the source existed', () => {
    // Analytics starts 2026-10-10: two days, 10 visitors → 5 a day, not 10/30.
    const web = { '2026-10-10': 4, '2026-10-11': 6 }
    expect(rangeStat(web, 'avg', '30', TODAY).value).toBe(5)
  })

  it('reads a level series at the end of each period', () => {
    const active = { '2026-10-04': 72, '2026-10-11': 79 }
    expect(rangeStat(active, 'level', '7', TODAY)).toEqual({ value: 79, previous: 72 })
  })
})

describe('levelAt', () => {
  it('carries the last known value over missing days', () => {
    expect(levelAt({ '2026-10-01': 70 }, '2026-10-05')).toBe(70)
    expect(levelAt({ '2026-10-01': 70 }, '2026-09-30')).toBeNull()
  })
})

describe('rangePoints', () => {
  it('plots each day for 7 and 30 days', () => {
    const { points, bucketDays } = rangePoints({ '2026-10-11': 2 }, 'sum', '7', TODAY)
    expect(bucketDays).toBe(1)
    expect(points).toHaveLength(7)
    expect(points[6]).toEqual({ day: TODAY, value: 2 })
  })

  it('plots weeks for 90 days, each point the week ending that day', () => {
    const { points, bucketDays } = rangePoints({ '2026-10-05': 1, '2026-10-11': 2 }, 'sum', '90', TODAY)
    expect(bucketDays).toBe(7)
    expect(points[points.length - 1]).toEqual({ day: TODAY, value: 3 })
  })

  it('leaves a gap, not a zero, before the source existed', () => {
    const { points } = rangePoints({ '2026-10-10': 1 }, 'sum', '7', TODAY)
    expect(points[0]?.value).toBeNull()
    expect(points[5]?.value).toBe(1)
  })
})

describe('helpers', () => {
  it('adds series day by day', () => {
    expect(addSeries({ a: 1, b: 2 }, { b: 3 })).toEqual({ a: 1, b: 5 })
  })

  it('ranks by count, largest first, skipping empty keys', () => {
    expect(rankBy(['Piura', 'Castilla', 'Piura', null], (x) => x)).toEqual([['Piura', 2], ['Castilla', 1]])
  })

  it('formats days in Spanish', () => {
    expect(shortDay('2026-10-11')).toBe('11 oct')
  })

  it('checks whether a day falls in the range', () => {
    expect(inRange('2026-10-05', '7', TODAY)).toBe(true)
    expect(inRange('2026-10-04', '7', TODAY)).toBe(false)
    expect(inRange(null, 'all', TODAY)).toBe(true)
  })
})
