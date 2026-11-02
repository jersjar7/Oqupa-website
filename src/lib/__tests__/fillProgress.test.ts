import { describe, it, expect } from 'vitest'
import {
  timeCurve,
  nextFill,
  publishRealProgress,
  FILL_HOLD,
  FILL_FAST_END,
} from '../fillProgress'

describe('timeCurve', () => {
  it('starts empty', () => {
    expect(timeCurve(0)).toBe(0)
    expect(timeCurve(-50)).toBe(0)
  })

  it('reaches 0.70 at about 4 seconds', () => {
    expect(timeCurve(4000)).toBeCloseTo(FILL_FAST_END, 5)
  })

  it('eases out: the first second covers more than a quarter of the fast part', () => {
    expect(timeCurve(1000)).toBeGreaterThan(FILL_FAST_END / 4)
    expect(timeCurve(1000)).toBeGreaterThan(timeCurve(3000) - timeCurve(2000))
  })

  it('climbs slowly from 0.70 toward 0.90 over about 25 seconds', () => {
    const at10 = timeCurve(4000 + 10000)
    const at25 = timeCurve(4000 + 25000)
    expect(at10).toBeGreaterThan(0.7)
    expect(at10).toBeLessThan(0.9)
    expect(at25).toBeGreaterThan(0.88)
    expect(at25).toBeLessThanOrEqual(FILL_HOLD)
  })

  it('holds at 0.90 and never passes it, however long it waits', () => {
    expect(timeCurve(10 * 60 * 1000)).toBeCloseTo(FILL_HOLD, 5)
    expect(timeCurve(Number.MAX_SAFE_INTEGER)).toBeLessThanOrEqual(FILL_HOLD)
  })

  it('never decreases with time', () => {
    let last = 0
    for (let ms = 0; ms <= 60000; ms += 50) {
      const v = timeCurve(ms)
      expect(v).toBeGreaterThanOrEqual(last)
      last = v
    }
  })
})

describe('nextFill', () => {
  it('follows real progress when it is ahead of the time curve', () => {
    expect(nextFill(0, 100, 0.6)).toBeCloseTo(0.6, 5)
  })

  it('follows the time curve when real progress lags', () => {
    expect(nextFill(0, 4000, 0.1)).toBeCloseTo(0.7, 5)
  })

  it('is capped at 0.90 before the work is confirmed, even at 100% real progress', () => {
    expect(nextFill(0, 100, 1)).toBe(FILL_HOLD)
  })

  it('never moves backwards, even if real progress drops', () => {
    const a = nextFill(0, 1000, 0.65)
    const b = nextFill(a, 1050, 0.1)
    expect(b).toBeGreaterThanOrEqual(a)
  })

  it('ignores nonsense input', () => {
    expect(nextFill(Number.NaN, 0, Number.NaN)).toBe(0)
  })
})

describe('publishRealProgress', () => {
  it('maps photos 0..1 onto 0..0.70', () => {
    expect(publishRealProgress('photos', 0)).toBe(0)
    expect(publishRealProgress('photos', 0.5)).toBeCloseTo(0.35, 5)
    expect(publishRealProgress('photos', 1)).toBeCloseTo(0.7, 5)
  })

  it('maps the save 0..1 onto 0.70..0.90', () => {
    expect(publishRealProgress('save', 0)).toBeCloseTo(0.7, 5)
    expect(publishRealProgress('save', 1)).toBeCloseTo(0.9, 5)
  })
})
