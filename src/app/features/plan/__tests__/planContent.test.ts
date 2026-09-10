import { describe, it, expect } from 'vitest'
import {
  PLAN_START,
  PLAN_END,
  PLAN_GOAL,
  PLAN_DAYS,
  type PlanDay,
} from '../planContent'

// ---------------------------------------------------------------------------
// planContent — data export integrity checks
// ---------------------------------------------------------------------------
describe('plan constants', () => {
  it('PLAN_START is in YYYY-MM-DD format', () => {
    expect(PLAN_START).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('PLAN_END is in YYYY-MM-DD format', () => {
    expect(PLAN_END).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('PLAN_END is after PLAN_START', () => {
    expect(PLAN_END > PLAN_START).toBe(true)
  })

  it('PLAN_GOAL is a non-empty string', () => {
    expect(typeof PLAN_GOAL).toBe('string')
    expect(PLAN_GOAL.length).toBeGreaterThan(0)
  })
})

describe('PLAN_DAYS', () => {
  it('is an array', () => {
    expect(Array.isArray(PLAN_DAYS)).toBe(true)
  })

  it('contains exactly 42 days (six weeks)', () => {
    expect(PLAN_DAYS.length).toBe(42)
  })

  it('each day has all required fields', () => {
    const requiredKeys: (keyof PlanDay)[] = [
      'day', 'date', 'week', 'phase', 'theme', 'category',
      'action', 'why', 'minutes', 'doneWhen', 'spend', 'owner',
    ]
    for (const planDay of PLAN_DAYS) {
      for (const key of requiredKeys) {
        expect(planDay[key]).toBeDefined()
      }
    }
  })

  it('day numbers run from 1 to 42 without gaps', () => {
    const dayNumbers = PLAN_DAYS.map((d) => d.day).sort((a, b) => a - b)
    expect(dayNumbers[0]).toBe(1)
    expect(dayNumbers[41]).toBe(42)
    for (let i = 0; i < 42; i++) {
      expect(dayNumbers[i]).toBe(i + 1)
    }
  })

  it('week numbers are between 1 and 6', () => {
    for (const planDay of PLAN_DAYS) {
      expect(planDay.week).toBeGreaterThanOrEqual(1)
      expect(planDay.week).toBeLessThanOrEqual(6)
    }
  })

  it('each date is in YYYY-MM-DD format', () => {
    for (const planDay of PLAN_DAYS) {
      expect(planDay.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('dates are in ascending order', () => {
    for (let i = 0; i < PLAN_DAYS.length - 1; i++) {
      expect(PLAN_DAYS[i]!.date <= PLAN_DAYS[i + 1]!.date).toBe(true)
    }
  })

  it('owner is either "jerson" or "engineering" for every day', () => {
    for (const planDay of PLAN_DAYS) {
      expect(['jerson', 'engineering']).toContain(planDay.owner)
    }
  })

  it('minutes is a positive number for every day', () => {
    for (const planDay of PLAN_DAYS) {
      expect(planDay.minutes).toBeGreaterThan(0)
    }
  })

  it('spend is a non-negative number for every day', () => {
    for (const planDay of PLAN_DAYS) {
      expect(planDay.spend).toBeGreaterThanOrEqual(0)
    }
  })

  it('action is a non-empty string for every day', () => {
    for (const planDay of PLAN_DAYS) {
      expect(planDay.action.length).toBeGreaterThan(0)
    }
  })

  it('doneWhen is a non-empty string for every day', () => {
    for (const planDay of PLAN_DAYS) {
      expect(planDay.doneWhen.length).toBeGreaterThan(0)
    }
  })

  it('plan starts on or after PLAN_START date', () => {
    expect(PLAN_DAYS[0]!.date >= PLAN_START).toBe(true)
  })

  it('plan ends on or before PLAN_END date', () => {
    expect(PLAN_DAYS[41]!.date <= PLAN_END).toBe(true)
  })

  it('has at least one day with a non-zero spend', () => {
    expect(PLAN_DAYS.some((d) => d.spend > 0)).toBe(true)
  })

  it('all days have a valid PlanOwner value', () => {
    const validOwners: string[] = ['jerson', 'engineering']
    for (const planDay of PLAN_DAYS) {
      expect(validOwners).toContain(planDay.owner)
    }
  })
})
