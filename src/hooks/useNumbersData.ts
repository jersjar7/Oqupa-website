import { useEffect, useState } from 'react'
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface MetricsSnapshot {
  date: string
  generatedAt: Date
  listings: {
    totalActive: number
    totalAllTime: number
    byOperationType: Record<string, number>
    byPropertyType: Record<string, number>
    byDistrito: Record<string, number>
    totalViews: number
    totalContactClicks: number
    newThisWeek: number
  }
  users: {
    totalVerified: number
    totalAllTime: number
    newThisWeek: number
  }
  payments: {
    lifetimeRevenuePEN: number
    weekRevenuePEN: number
    succeededCount: number
  }
}

interface UseNumbersData {
  latest: MetricsSnapshot | null
  history: MetricsSnapshot[]
  isLoading: boolean
  error: string | null
}

const HISTORY_DAYS = 90

export function useNumbersData(): UseNumbersData {
  const [latest, setLatest] = useState<MetricsSnapshot | null>(null)
  const [history, setHistory] = useState<MetricsSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const q = query(
          collection(db, 'publicMetrics'),
          orderBy('date', 'desc'),
          limit(HISTORY_DAYS),
        )
        const snap = await getDocs(q)
        const docs: MetricsSnapshot[] = snap.docs.map((d) => {
          const data = d.data() as Omit<MetricsSnapshot, 'generatedAt'> & {
            generatedAt?: { toDate: () => Date }
          }
          return {
            ...data,
            generatedAt: data.generatedAt?.toDate?.() ?? new Date(),
          } as MetricsSnapshot
        })

        if (cancelled) return
        setLatest(docs[0] ?? null)
        // Chart consumers want chronological order
        setHistory([...docs].reverse())
        setIsLoading(false)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Error desconocido')
        setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { latest, history, isLoading, error }
}
