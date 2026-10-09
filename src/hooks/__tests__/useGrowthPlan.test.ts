// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mock the Firebase-backed service
// ---------------------------------------------------------------------------

let subscribeToPlanMock: Mock

vi.mock('@/services/growthPlanService', () => ({
  get growthPlanService() {
    return {
      subscribeToPlan: (...args: unknown[]) => subscribeToPlanMock(...args),
    }
  },
}))

import { todayKey, useGrowthPlan } from '../useGrowthPlan'
import type { GrowthPlanDay } from '@/types/growthPlan'

// ---------------------------------------------------------------------------
// Fixture helper
// ---------------------------------------------------------------------------

function mkDay(
  day: number,
  week: number,
  opts: Partial<GrowthPlanDay> = {},
): GrowthPlanDay {
  return {
    day,
    week,
    date: `2026-06-${String(day).padStart(2, '0')}`,
    phase: `Phase ${week}`,
    theme: `Theme ${week}`,
    category: 'Tech',
    action: `Action ${day}`,
    why: `Why ${day}`,
    minutes: 30,
    doneWhen: `Done when ${day}`,
    spend: 0,
    owner: 'jerson',
    status: 'pending',
    ...opts,
  } as GrowthPlanDay
}

// ---------------------------------------------------------------------------
// todayKey — pure function
// ---------------------------------------------------------------------------

describe('todayKey', () => {
  it('returns a YYYY-MM-DD string for a given date', () => {
    expect(todayKey(new Date(2026, 5, 15))).toBe('2026-06-15')
  })

  it('zero-pads month and day', () => {
    expect(todayKey(new Date(2026, 0, 1))).toBe('2026-01-01')
  })

  it('handles December (month 11)', () => {
    expect(todayKey(new Date(2026, 11, 31))).toBe('2026-12-31')
  })

  it('defaults to today when no argument is provided (returns a valid YYYY-MM-DD string)', () => {
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

// ---------------------------------------------------------------------------
// useGrowthPlan — reactive hook
// ---------------------------------------------------------------------------

describe('useGrowthPlan', () => {
  beforeEach(() => {
    subscribeToPlanMock = vi.fn(() => () => {})
  })

  it('starts with isLoading=true, empty arrays, and no error', () => {
    const { result } = renderHook(() => useGrowthPlan())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.days).toEqual([])
    expect(result.current.weeks).toEqual([])
    expect(result.current.today).toBeNull()
    expect(result.current.doneCount).toBe(0)
    expect(result.current.remainingMinutes).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('populates days and sets isLoading=false when the service delivers data', async () => {
    const planDays = [mkDay(1, 1), mkDay(2, 1), mkDay(3, 2)]

    subscribeToPlanMock.mockImplementation(
      (onData: (days: GrowthPlanDay[]) => void) => {
        onData(planDays)
        return () => {}
      },
    )

    const { result } = renderHook(() => useGrowthPlan())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.days).toHaveLength(3)
    expect(result.current.error).toBeNull()
  })

  it('groups days into weeks', async () => {
    const planDays = [mkDay(1, 1), mkDay(2, 1), mkDay(3, 2)]

    subscribeToPlanMock.mockImplementation(
      (onData: (days: GrowthPlanDay[]) => void) => {
        onData(planDays)
        return () => {}
      },
    )

    const { result } = renderHook(() => useGrowthPlan())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.weeks).toHaveLength(2)
    const week1 = result.current.weeks.find((w) => w.week === 1)!
    expect(week1.days).toHaveLength(2)
    const week2 = result.current.weeks.find((w) => w.week === 2)!
    expect(week2.days).toHaveLength(1)
  })

  it('counts done tasks correctly', async () => {
    const planDays = [
      mkDay(1, 1, { status: 'done' }),
      mkDay(2, 1, { status: 'done' }),
      mkDay(3, 2, { status: 'pending' }),
    ]

    subscribeToPlanMock.mockImplementation(
      (onData: (days: GrowthPlanDay[]) => void) => {
        onData(planDays)
        return () => {}
      },
    )

    const { result } = renderHook(() => useGrowthPlan())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.doneCount).toBe(2)
  })

  it('calculates remainingMinutes for non-done days only', async () => {
    const planDays = [
      mkDay(1, 1, { status: 'done', minutes: 60 }),
      mkDay(2, 1, { status: 'pending', minutes: 30 }),
      mkDay(3, 2, { status: 'pending', minutes: 45 }),
    ]

    subscribeToPlanMock.mockImplementation(
      (onData: (days: GrowthPlanDay[]) => void) => {
        onData(planDays)
        return () => {}
      },
    )

    const { result } = renderHook(() => useGrowthPlan())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.remainingMinutes).toBe(75)
  })

  it('finds today in the plan', async () => {
    const today = todayKey()
    const planDays = [
      mkDay(1, 1, { date: today }),
      mkDay(2, 1, { date: '2026-06-02' }),
    ]

    subscribeToPlanMock.mockImplementation(
      (onData: (days: GrowthPlanDay[]) => void) => {
        onData(planDays)
        return () => {}
      },
    )

    const { result } = renderHook(() => useGrowthPlan())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.today).not.toBeNull()
    expect(result.current.today!.date).toBe(today)
  })

  it('sets error when the service fires the error callback', async () => {
    subscribeToPlanMock.mockImplementation(
      (_onData: unknown, onError: (e: Error) => void) => {
        onError(new Error('permission-denied'))
        return () => {}
      },
    )

    const { result } = renderHook(() => useGrowthPlan())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).not.toBeNull()
    expect(result.current.days).toEqual([])
  })

  it('uses empty string for phase/theme when the first day in a week has undefined values (lines 70-71 ?? "" branches)', async () => {
    const planDays = [
      mkDay(1, 1, { phase: undefined as unknown as string, theme: undefined as unknown as string }),
    ]

    subscribeToPlanMock.mockImplementation(
      (onData: (days: typeof planDays) => void) => {
        onData(planDays)
        return () => {}
      },
    )

    const { result } = renderHook(() => useGrowthPlan())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const week1 = result.current.weeks.find((w) => w.week === 1)!
    expect(week1.phase).toBe('')
    expect(week1.theme).toBe('')
  })

  it('week doneCount counts only done days in that week', async () => {
    const planDays = [
      mkDay(1, 1, { status: 'done' }),
      mkDay(2, 1, { status: 'pending' }),
    ]

    subscribeToPlanMock.mockImplementation(
      (onData: (days: GrowthPlanDay[]) => void) => {
        onData(planDays)
        return () => {}
      },
    )

    const { result } = renderHook(() => useGrowthPlan())

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const week1 = result.current.weeks.find((w) => w.week === 1)!
    expect(week1.doneCount).toBe(1)
  })
})
