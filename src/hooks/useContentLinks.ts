import { useEffect, useMemo, useState } from 'react'
import { contentLinkService } from '@/services/contentLinkService'
import type { ContentLink } from '@/types/contentLink'

/** 'YYYY-MM-DD' for a local date — never toISOString(), which shifts to UTC. */
export function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Every day in the given month, as date keys. */
export function daysInMonth(year: number, month: number): string[] {
  const count = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: count }, (_, i) => dateKey(year, month, i + 1))
}

interface UseContentLinks {
  /** Links for the month, grouped by date key. Days with none are absent. */
  byDate: Record<string, ContentLink[]>
  isLoading: boolean
  error: string | null
}

/**
 * Live links for one month. Re-subscribes when the month changes so moving
 * between months does not accumulate listeners.
 */
export function useContentLinks(year: number, month: number): UseContentLinks {
  const [links, setLinks] = useState<ContentLink[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)

    const days = daysInMonth(year, month)
    const first = days[0]!
    const last = days[days.length - 1]!

    const unsubscribe = contentLinkService.subscribeToMonth(
      first,
      last,
      (next) => {
        setLinks(next)
        setIsLoading(false)
      },
      (err) => {
        console.error('useContentLinks:', err)
        setError('No se pudo cargar el calendario de contenido.')
        setIsLoading(false)
      },
    )
    return unsubscribe
  }, [year, month])

  const byDate = useMemo(() => {
    const grouped: Record<string, ContentLink[]> = {}
    for (const link of links) {
      ;(grouped[link.date] ??= []).push(link)
    }
    // Oldest first inside a day, so the order stays stable as links are added.
    for (const key of Object.keys(grouped)) {
      grouped[key]!.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    }
    return grouped
  }, [links])

  return { byDate, isLoading, error }
}
