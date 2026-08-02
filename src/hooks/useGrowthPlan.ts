import { useEffect, useMemo, useState } from 'react'
import { growthPlanService } from '@/services/growthPlanService'
import type { GrowthPlanDay } from '@/types/growthPlan'

/** 'YYYY-MM-DD' for a local date — never toISOString(), which shifts to UTC. */
export function todayKey(now: Date = new Date()): string {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

export interface PlanWeek {
  week: number
  phase: string
  theme: string
  days: GrowthPlanDay[]
  doneCount: number
  /** True when today falls inside this week — the one to open by default. */
  isCurrent: boolean
}

interface UseGrowthPlan {
  days: GrowthPlanDay[]
  weeks: PlanWeek[]
  today: GrowthPlanDay | null
  doneCount: number
  /** Minutes committed by days not yet done — what is still owed. */
  remainingMinutes: number
  isLoading: boolean
  error: string | null
}

export function useGrowthPlan(): UseGrowthPlan {
  const [days, setDays] = useState<GrowthPlanDay[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    const unsubscribe = growthPlanService.subscribeToPlan(
      (next) => {
        setDays(next)
        setIsLoading(false)
      },
      (err) => {
        console.error('useGrowthPlan:', err)
        setError('No se pudo cargar el plan.')
        setIsLoading(false)
      },
    )
    return unsubscribe
  }, [])

  const key = todayKey()

  const weeks = useMemo(() => {
    const grouped = new Map<number, GrowthPlanDay[]>()
    for (const d of days) {
      const list = grouped.get(d.week)
      if (list) list.push(d)
      else grouped.set(d.week, [d])
    }
    return [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([week, list]) => ({
        week,
        phase: list[0]?.phase ?? '',
        theme: list[0]?.theme ?? '',
        days: list,
        doneCount: list.filter((d) => d.status === 'done').length,
        isCurrent: list.some((d) => d.date === key),
      }))
  }, [days, key])

  return {
    days,
    weeks,
    today: days.find((d) => d.date === key) ?? null,
    doneCount: days.filter((d) => d.status === 'done').length,
    remainingMinutes: days
      .filter((d) => d.status !== 'done')
      .reduce((sum, d) => sum + d.minutes, 0),
    isLoading,
    error,
  }
}
