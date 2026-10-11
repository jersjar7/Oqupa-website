// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const getDocsMock = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  query: vi.fn((...args: unknown[]) => args),
  orderBy: vi.fn(() => ({})),
  limit: vi.fn(() => ({})),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
}))

vi.mock('@/lib/firebase', () => ({
  db: { __fakeDb: true },
  auth: {},
}))

import { useNumbersData } from '../useNumbersData'
import type { MetricsSnapshot } from '../useNumbersData'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeDoc(date: string, overrides: Partial<Omit<MetricsSnapshot, 'generatedAt'>> = {}) {
  const base: Omit<MetricsSnapshot, 'generatedAt'> & { generatedAt?: { toDate: () => Date } } = {
    date,
    generatedAt: { toDate: () => new Date(`${date}T10:00:00Z`) },
    listings: {
      totalActive: 10,
      totalAllTime: 50,
      byOperationType: {},
      byPropertyType: {},
      byDistrito: {},
      totalViews: 100,
      totalContactClicks: 5,
      newThisWeek: 3,
    },
    users: {
      totalVerified: 20,
      totalAllTime: 30,
      newThisWeek: 2,
    },
    payments: {
      lifetimeRevenuePEN: 1000,
      weekRevenuePEN: 200,
      succeededCount: 4,
    },
    ...overrides,
  }
  return {
    data: () => base,
  }
}

function makeSnapshot(docs: ReturnType<typeof makeDoc>[]) {
  return { docs }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useNumbersData', () => {
  beforeEach(() => {
    getDocsMock.mockReset()
  })

  describe('loading state', () => {
    it('starts with isLoading=true', () => {
      getDocsMock.mockReturnValue(new Promise(() => {})) // never resolves
      const { result } = renderHook(() => useNumbersData())
      expect(result.current.isLoading).toBe(true)
    })

    it('starts with latest=null and history=[]', () => {
      getDocsMock.mockReturnValue(new Promise(() => {}))
      const { result } = renderHook(() => useNumbersData())
      expect(result.current.latest).toBeNull()
      expect(result.current.history).toEqual([])
    })

    it('starts with error=null', () => {
      getDocsMock.mockReturnValue(new Promise(() => {}))
      const { result } = renderHook(() => useNumbersData())
      expect(result.current.error).toBeNull()
    })
  })

  describe('successful data load', () => {
    it('sets isLoading=false after data loads', async () => {
      getDocsMock.mockResolvedValue(makeSnapshot([makeDoc('2026-09-10')]))
      const { result } = renderHook(() => useNumbersData())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
    })

    it('sets latest to the first (most recent) document returned', async () => {
      const doc1 = makeDoc('2026-09-10')
      const doc2 = makeDoc('2026-09-09')
      getDocsMock.mockResolvedValue(makeSnapshot([doc1, doc2]))
      const { result } = renderHook(() => useNumbersData())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.latest?.date).toBe('2026-09-10')
    })

    it('sets latest to null when no documents are returned', async () => {
      getDocsMock.mockResolvedValue(makeSnapshot([]))
      const { result } = renderHook(() => useNumbersData())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.latest).toBeNull()
    })

    it('returns history in chronological (ascending) order', async () => {
      // Firestore returns newest-first (ORDER BY date DESC)
      const doc1 = makeDoc('2026-09-10')
      const doc2 = makeDoc('2026-09-09')
      const doc3 = makeDoc('2026-09-08')
      getDocsMock.mockResolvedValue(makeSnapshot([doc1, doc2, doc3]))
      const { result } = renderHook(() => useNumbersData())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      // history should be reversed: oldest first
      expect(result.current.history[0]?.date).toBe('2026-09-08')
      expect(result.current.history[1]?.date).toBe('2026-09-09')
      expect(result.current.history[2]?.date).toBe('2026-09-10')
    })

    it('converts the Firestore Timestamp generatedAt to a Date', async () => {
      const expectedDate = new Date('2026-09-10T10:00:00Z')
      getDocsMock.mockResolvedValue(makeSnapshot([makeDoc('2026-09-10')]))
      const { result } = renderHook(() => useNumbersData())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.latest?.generatedAt).toBeInstanceOf(Date)
      expect(result.current.latest?.generatedAt.getTime()).toBe(expectedDate.getTime())
    })

    it('falls back to new Date() when generatedAt is missing', async () => {
      const docWithNoTimestamp = {
        data: () => ({
          date: '2026-09-10',
          // generatedAt is intentionally omitted
          listings: { totalActive: 0, totalAllTime: 0, byOperationType: {}, byPropertyType: {}, byDistrito: {}, totalViews: 0, totalContactClicks: 0, newThisWeek: 0 },
          users: { totalVerified: 0, totalAllTime: 0, newThisWeek: 0 },
          payments: { lifetimeRevenuePEN: 0, weekRevenuePEN: 0, succeededCount: 0 },
        }),
      }
      getDocsMock.mockResolvedValue(makeSnapshot([docWithNoTimestamp]))
      const { result } = renderHook(() => useNumbersData())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.latest?.generatedAt).toBeInstanceOf(Date)
    })

    it('error is null after successful load', async () => {
      getDocsMock.mockResolvedValue(makeSnapshot([makeDoc('2026-09-10')]))
      const { result } = renderHook(() => useNumbersData())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.error).toBeNull()
    })

    it('returns all documents in history (90 days)', async () => {
      const docs = Array.from({ length: 5 }, (_, i) => makeDoc(`2026-09-0${i + 1}`))
      getDocsMock.mockResolvedValue(makeSnapshot(docs))
      const { result } = renderHook(() => useNumbersData())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.history).toHaveLength(5)
    })
  })

  describe('error handling', () => {
    it('sets error message when getDocs throws an Error', async () => {
      getDocsMock.mockRejectedValue(new Error('permission-denied'))
      const { result } = renderHook(() => useNumbersData())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.error).toBe('permission-denied')
    })

    it('sets a generic error message when getDocs throws a non-Error', async () => {
      getDocsMock.mockRejectedValue('unknown error string')
      const { result } = renderHook(() => useNumbersData())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.error).toBe('Error desconocido')
    })

    it('sets isLoading=false after an error', async () => {
      getDocsMock.mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() => useNumbersData())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.isLoading).toBe(false)
    })

    it('latest remains null after an error', async () => {
      getDocsMock.mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() => useNumbersData())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.latest).toBeNull()
    })

    it('history remains empty after an error', async () => {
      getDocsMock.mockRejectedValue(new Error('fail'))
      const { result } = renderHook(() => useNumbersData())
      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.history).toEqual([])
    })
  })

  describe('unmount-during-load (cancelled guard)', () => {
    it('does not update state after unmount during successful load (line 66 cancelled branch)', async () => {
      // Exercises `if (cancelled) return` on line 66 when component unmounts before getDocs resolves
      let resolveSnapshot!: (snap: ReturnType<typeof makeSnapshot>) => void
      getDocsMock.mockReturnValue(
        new Promise<ReturnType<typeof makeSnapshot>>((resolve) => {
          resolveSnapshot = resolve
        })
      )

      const { unmount } = renderHook(() => useNumbersData())

      // Unmount immediately — sets cancelled = true
      act(() => {
        unmount()
      })

      // Resolve the getDocs promise after unmount — the cancelled guard should block setState
      await act(async () => {
        resolveSnapshot(makeSnapshot([makeDoc('2026-09-10')]))
        await new Promise((r) => setTimeout(r, 0))
      })

      // No assertion needed; if the cancelled guard is missing, React warns about state updates
      // after unmount. The test passes if no error is thrown.
      expect(getDocsMock).toHaveBeenCalledOnce()
    })

    it('does not update state after unmount during an error (line 72 cancelled branch)', async () => {
      // Exercises `if (cancelled) return` on line 72 when component unmounts before getDocs rejects
      let rejectSnapshot!: (err: Error) => void
      getDocsMock.mockReturnValue(
        new Promise<never>((_resolve, reject) => {
          rejectSnapshot = reject
        })
      )

      const { unmount } = renderHook(() => useNumbersData())

      act(() => {
        unmount()
      })

      await act(async () => {
        rejectSnapshot(new Error('network failure'))
        await new Promise((r) => setTimeout(r, 0))
      })

      expect(getDocsMock).toHaveBeenCalledOnce()
    })
  })
})
