import { describe, it, expect } from 'vitest'
import { checkpointDate, monthChange, changeWords, latestComplete, monthName, type CheckpointMonth } from '../checkpoint'

const m = (month: string, over: Partial<CheckpointMonth> = {}): CheckpointMonth => ({
  month,
  complete: true,
  activeListings: null,
  newListings: null,
  contacts: null,
  returning: null,
  ...over,
})

describe('monthName', () => {
  it('names the month in Spanish, lowercase, with the year', () => {
    expect(monthName('2026-10')).toBe('octubre 2026')
    expect(monthName('2027-02')).toBe('febrero 2027')
  })
})

describe('checkpointDate', () => {
  it('writes the day in words', () => {
    expect(checkpointDate('2027-02-28')).toBe('28 de febrero de 2027')
  })
})

describe('monthChange', () => {
  it('gives direction and whole percent against the month before', () => {
    expect(monthChange(72, 91)).toEqual({ direction: 'up', percent: 26 })
    expect(monthChange(78, 67)).toEqual({ direction: 'down', percent: 14 })
    expect(monthChange(5, 5)).toEqual({ direction: 'same', percent: 0 })
  })

  it('has no percent when the month before was zero', () => {
    expect(monthChange(0, 3)).toEqual({ direction: 'up', percent: null })
    expect(monthChange(0, 0)).toEqual({ direction: 'same', percent: 0 })
  })

  it('says nothing when either month has no data', () => {
    expect(monthChange(null, 3)).toBeNull()
    expect(monthChange(3, null)).toBeNull()
  })
})

describe('changeWords', () => {
  it('reads as an arrow and a percent', () => {
    expect(changeWords({ direction: 'up', percent: 26 })).toBe('▲ 26 %')
    expect(changeWords({ direction: 'down', percent: 14 })).toBe('▼ 14 %')
    expect(changeWords({ direction: 'same', percent: 0 })).toBe('= igual')
    expect(changeWords({ direction: 'up', percent: null })).toBe('▲ desde 0')
  })
})

describe('latestComplete', () => {
  it('compares the newest complete month with the one before — never the month in progress', () => {
    const months = [
      m('2026-09', { contacts: 1 }),
      m('2026-10', { contacts: 5 }),
      m('2026-11', { complete: false, contacts: 0 }),
    ]
    expect(latestComplete(months, 'contacts')).toEqual({
      month: '2026-10',
      value: 5,
      previousMonth: '2026-09',
      change: { direction: 'up', percent: 400 },
    })
  })

  it('has no change when the month before has no data', () => {
    const months = [m('2026-08', { returning: null }), m('2026-09', { returning: 67 })]
    expect(latestComplete(months, 'returning')).toEqual({ month: '2026-09', value: 67, previousMonth: '2026-08', change: null })
  })

  it('is null when no complete month has the number', () => {
    expect(latestComplete([m('2026-11', { complete: false, contacts: 2 })], 'contacts')).toBeNull()
    expect(latestComplete([m('2026-10')], 'returning')).toBeNull()
  })
})
