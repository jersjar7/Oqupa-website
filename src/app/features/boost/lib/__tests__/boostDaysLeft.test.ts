// Days of boost left, as the owner reads them. Must match the app's chip
// (Listing.boostDaysRemaining): partial days round UP, so a boost bought a
// moment ago for 30 days reads 30 (TestFlight 1.5.1 (35), 2026-11-02, read 29);
// a browser clock a few seconds behind the server never makes it read 31.
import { describe, it, expect } from 'vitest'
import { boostDaysLeft } from '../boostDaysLeft'

const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000
const now = new Date('2026-11-02T15:00:00Z').getTime()
const until = (ms: number) => new Date(now + ms)

describe('boostDaysLeft', () => {
  it('no end date → null', () => {
    expect(boostDaysLeft(undefined, 'thirtyDays', now)).toBeNull()
  })
  it('just bought 30 days → 30', () => {
    expect(boostDaysLeft(until(30 * DAY), 'thirtyDays', now)).toBe(30)
  })
  it('a minute after buying 30 days → still 30', () => {
    expect(boostDaysLeft(until(30 * DAY - 60_000), 'thirtyDays', now)).toBe(30)
  })
  it('29 days and an hour left → 30; exactly 29 → 29', () => {
    expect(boostDaysLeft(until(29 * DAY + HOUR), 'thirtyDays', now)).toBe(30)
    expect(boostDaysLeft(until(29 * DAY), 'thirtyDays', now)).toBe(29)
  })
  it('one hour left → 1, ended → 0', () => {
    expect(boostDaysLeft(until(HOUR), 'thirtyDays', now)).toBe(1)
    expect(boostDaysLeft(until(-HOUR), 'thirtyDays', now)).toBe(0)
  })
  it('a clock a few seconds behind never shows 31 for a fresh 30-day boost', () => {
    expect(boostDaysLeft(until(30 * DAY + 5_000), 'thirtyDays', now)).toBe(30)
  })
  it('a boost bought on top of a running one keeps its real total', () => {
    expect(boostDaysLeft(until(37 * DAY), 'thirtyDays', now)).toBe(37)
  })
  it('an unknown tier still rounds up', () => {
    expect(boostDaysLeft(until(30 * DAY + 5_000), undefined, now)).toBe(31)
  })
})
