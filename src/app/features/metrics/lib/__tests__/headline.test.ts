import { describe, it, expect } from 'vitest'
import { weekWindow, contactsThisWeek, costPerContactThisWeek, durationWords, percent } from '../headline'

// The nightly job runs at 03:45 Lima, so "this week" is the 7 complete days before today.
const TODAY = '2026-10-23'

describe('weekWindow', () => {
  it('is the 7 complete days before today', () => {
    expect(weekWindow(TODAY)).toEqual({ from: '2026-10-16', to: '2026-10-22' })
  })
})

describe('contactsThisWeek', () => {
  it('compares the last 7 complete days with the weekly average of the 4 weeks before', () => {
    const series = {
      '2026-10-23': 50, // today: not complete, not counted
      '2026-10-22': 3,
      '2026-10-16': 2, // first day of the week
      '2026-10-15': 4, // last day of the 4 weeks before
      '2026-09-18': 8, // first day of the 4 weeks before
      '2026-09-17': 100, // outside both
    }
    expect(contactsThisWeek(series, TODAY, '2026-08-08')).toEqual({ week: 5, average: 3 })
  })

  it('has no average when the contact log is younger than those 4 weeks', () => {
    expect(contactsThisWeek({ '2026-10-20': 1 }, TODAY, '2026-10-01')).toEqual({ week: 1, average: null })
    expect(contactsThisWeek({}, TODAY, null)).toEqual({ week: 0, average: null })
  })
})

describe('costPerContactThisWeek', () => {
  it('divides this week’s Meta spend by this week’s contacts', () => {
    const spend = { '2026-10-22': 10, '2026-10-16': 5, '2026-10-15': 99 }
    const contacts = { '2026-10-20': 2, '2026-10-21': 1 }
    expect(costPerContactThisWeek(spend, contacts, TODAY)).toEqual({ spend: 15, contacts: 3, perContact: 5 })
  })

  it('is null, not infinite, in a week without contacts', () => {
    expect(costPerContactThisWeek({ '2026-10-20': 4 }, {}, TODAY).perContact).toBeNull()
  })
})

describe('durationWords', () => {
  it('speaks in hours under two days, and in days after', () => {
    expect(durationWords(0.4)).toBe('menos de 1 hora')
    expect(durationWords(1)).toBe('1 hora')
    expect(durationWords(5.6)).toBe('6 horas')
    expect(durationWords(47)).toBe('47 horas')
    expect(durationWords(60)).toBe('2.5 días')
    expect(durationWords(null)).toBe('—')
  })
})

describe('percent', () => {
  it('rounds to whole percent and never divides by zero', () => {
    expect(percent(1, 3)).toBe('33 %')
    expect(percent(0, 0)).toBe('—')
  })
})
