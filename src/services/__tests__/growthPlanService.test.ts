// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  updateDocMock, onSnapshotMock,
  queryMock, collectionMock, docMock, orderByMock,
} = vi.hoisted(() => ({
  updateDocMock: vi.fn().mockResolvedValue(undefined),
  onSnapshotMock: vi.fn((..._args: unknown[]) => vi.fn()),
  queryMock: vi.fn((...args: unknown[]): Record<string, unknown> => ({ __query: args })),
  collectionMock: vi.fn((..._args: unknown[]): Record<string, unknown> => ({ __col: 'growthPlan' })),
  docMock: vi.fn((...args: unknown[]) => ({ path: `${args[1]}/${args[2]}` })),
  orderByMock: vi.fn((..._args: unknown[]) => ({ __orderBy: true })),
}))

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => collectionMock(...args),
  doc: (...args: unknown[]) => docMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  orderBy: (...args: unknown[]) => orderByMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
  serverTimestamp: vi.fn(() => ({ _server: true })),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
}))

vi.mock('@/lib/firebase', () => ({ db: { __fakeDb: true } }))

import { growthPlanService } from '../growthPlanService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSnapshotDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data }
}

function fireOnChange(docs: ReturnType<typeof makeSnapshotDoc>[]) {
  const call = onSnapshotMock.mock.calls[onSnapshotMock.mock.calls.length - 1]
  const successCallback = call?.[1] as (snap: { docs: typeof docs }) => void
  successCallback?.({ docs })
}

function fireOnError(error: Error) {
  const call = onSnapshotMock.mock.calls[onSnapshotMock.mock.calls.length - 1]
  const errorCallback = call?.[2] as (err: Error) => void
  errorCallback?.(error)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('growthPlanService', () => {
  beforeEach(() => {
    updateDocMock.mockReset().mockResolvedValue(undefined)
    onSnapshotMock.mockReset().mockReturnValue(vi.fn())
    queryMock.mockReset().mockReturnValue({ __query: true })
    collectionMock.mockReset().mockReturnValue({ __col: true })
    orderByMock.mockReset().mockReturnValue({ __orderBy: true })
  })

  // ── subscribeToPlan ─────────────────────────────────────────────────────

  describe('subscribeToPlan', () => {
    it('returns an unsubscribe function', () => {
      const unsubFn = vi.fn()
      onSnapshotMock.mockReturnValue(unsubFn)
      const unsub = growthPlanService.subscribeToPlan(vi.fn(), vi.fn())
      expect(unsub).toBe(unsubFn)
    })

    it('orders by __name__ (document ID) ascending', () => {
      growthPlanService.subscribeToPlan(vi.fn(), vi.fn())
      expect(orderByMock).toHaveBeenCalledWith('__name__')
    })

    it('maps Firestore docs to GrowthPlanDay objects and calls onNext', () => {
      const onNext = vi.fn()
      growthPlanService.subscribeToPlan(onNext, vi.fn())

      fireOnChange([
        makeSnapshotDoc('2026-09-01', {
          day: 1,
          week: 1,
          phase: 'Alpha',
          theme: 'Brand awareness',
          category: 'Social',
          action: 'Post reel',
          why: 'Reach',
          minutes: 30,
          spend: 0,
          doneWhen: 'Posted and shared',
          owner: 'jerson',
          status: 'pending',
          notes: 'Some notes',
          completedAt: null,
          completedByEmail: '',
        }),
      ])

      expect(onNext).toHaveBeenCalledOnce()
      const days = onNext.mock.calls[0]![0]
      expect(days).toHaveLength(1)
      expect(days[0].date).toBe('2026-09-01')
      expect(days[0].day).toBe(1)
      expect(days[0].week).toBe(1)
      expect(days[0].phase).toBe('Alpha')
      expect(days[0].theme).toBe('Brand awareness')
      expect(days[0].status).toBe('pending')
      expect(days[0].notes).toBe('Some notes')
      expect(days[0].completedAt).toBeNull()
    })

    it('calls onError when Firestore fires an error', () => {
      const onError = vi.fn()
      growthPlanService.subscribeToPlan(vi.fn(), onError)
      const error = new Error('permission-denied')
      fireOnError(error)
      expect(onError).toHaveBeenCalledWith(error)
    })

    it('converts Firestore Timestamp completedAt to Date when present', () => {
      const completedDate = new Date('2026-09-05T12:00:00Z')
      const onNext = vi.fn()
      growthPlanService.subscribeToPlan(onNext, vi.fn())

      fireOnChange([
        makeSnapshotDoc('2026-09-05', {
          day: 5,
          week: 1,
          phase: '',
          theme: '',
          category: '',
          action: '',
          why: '',
          minutes: 0,
          spend: 0,
          doneWhen: '',
          owner: 'jerson',
          status: 'done',
          notes: '',
          completedAt: { toDate: () => completedDate },
          completedByEmail: 'jerson@oqupa.com',
        }),
      ])

      const days = onNext.mock.calls[0]![0]
      expect(days[0].completedAt).toEqual(completedDate)
    })

    it('passes a Date object through toDate unchanged (instanceof Date branch)', () => {
      // Exercises line 19: `if (value instanceof Date) return value`
      const completedDate = new Date('2026-09-05T12:00:00Z')
      const onNext = vi.fn()
      growthPlanService.subscribeToPlan(onNext, vi.fn())

      fireOnChange([
        makeSnapshotDoc('2026-09-05', {
          day: 5, week: 1, phase: '', theme: '', category: '', action: '',
          why: '', minutes: 0, spend: 0, doneWhen: '', owner: 'jerson',
          status: 'done', notes: '',
          completedAt: completedDate, // already a Date object, not a Timestamp
          completedByEmail: 'jerson@oqupa.com',
        }),
      ])

      const days = onNext.mock.calls[0]![0]
      expect(days[0].completedAt).toBe(completedDate)
    })

    it('returns null when completedAt has no toDate method (unexpected object)', () => {
      // Exercises line 21: `typeof ts.toDate === 'function' ? ts.toDate() : null`
      const onNext = vi.fn()
      growthPlanService.subscribeToPlan(onNext, vi.fn())

      fireOnChange([
        makeSnapshotDoc('2026-09-06', {
          day: 6, week: 1, phase: '', theme: '', category: '', action: '',
          why: '', minutes: 0, spend: 0, doneWhen: '', owner: 'jerson',
          status: 'done', notes: '',
          completedAt: { notATimestamp: true }, // object without toDate()
          completedByEmail: '',
        }),
      ])

      const days = onNext.mock.calls[0]![0]
      expect(days[0].completedAt).toBeNull()
    })

    it('uses "pending" status as fallback for unknown status values', () => {
      const onNext = vi.fn()
      growthPlanService.subscribeToPlan(onNext, vi.fn())

      fireOnChange([
        makeSnapshotDoc('2026-09-06', {
          day: 6,
          week: 1,
          phase: '',
          theme: '',
          category: '',
          action: '',
          why: '',
          minutes: 0,
          spend: 0,
          doneWhen: '',
          owner: 'jerson',
          status: 'unknown-status', // invalid value
          notes: '',
          completedAt: null,
          completedByEmail: '',
        }),
      ])

      const days = onNext.mock.calls[0]![0]
      expect(days[0].status).toBe('pending')
    })

    it('accepts "done" and "skipped" as valid status values', () => {
      const onNext = vi.fn()
      growthPlanService.subscribeToPlan(onNext, vi.fn())

      fireOnChange([
        makeSnapshotDoc('2026-09-07', {
          day: 7, week: 1, phase: '', theme: '', category: '', action: '',
          why: '', minutes: 0, spend: 0, doneWhen: '', owner: 'jerson',
          status: 'done', notes: '', completedAt: null, completedByEmail: '',
        }),
        makeSnapshotDoc('2026-09-08', {
          day: 8, week: 2, phase: '', theme: '', category: '', action: '',
          why: '', minutes: 0, spend: 0, doneWhen: '', owner: 'jerson',
          status: 'skipped', notes: '', completedAt: null, completedByEmail: '',
        }),
      ])

      const days = onNext.mock.calls[0]![0]
      expect(days[0].status).toBe('done')
      expect(days[1].status).toBe('skipped')
    })

    it('falls back to numeric 0 for missing numeric fields', () => {
      const onNext = vi.fn()
      growthPlanService.subscribeToPlan(onNext, vi.fn())

      fireOnChange([
        makeSnapshotDoc('2026-09-09', {
          // day, week, minutes, spend intentionally omitted
          phase: '',
          theme: '',
          category: '',
          action: '',
          why: '',
          doneWhen: '',
          owner: 'jerson',
          status: 'pending',
          notes: '',
          completedAt: null,
          completedByEmail: '',
        }),
      ])

      const days = onNext.mock.calls[0]![0]
      expect(days[0].day).toBe(0)
      expect(days[0].week).toBe(0)
      expect(days[0].minutes).toBe(0)
      expect(days[0].spend).toBe(0)
    })

    it('falls back to empty string for missing string fields', () => {
      const onNext = vi.fn()
      growthPlanService.subscribeToPlan(onNext, vi.fn())

      fireOnChange([
        makeSnapshotDoc('2026-09-10', {
          // all string fields omitted except required ones
          day: 1,
          week: 1,
          completedAt: null,
          completedByEmail: '',
          status: 'pending',
        }),
      ])

      const days = onNext.mock.calls[0]![0]
      expect(days[0].phase).toBe('')
      expect(days[0].theme).toBe('')
      expect(days[0].category).toBe('')
      expect(days[0].action).toBe('')
      expect(days[0].why).toBe('')
      expect(days[0].doneWhen).toBe('')
      expect(days[0].notes).toBe('')
    })

    it('defaults owner to "jerson" when missing', () => {
      const onNext = vi.fn()
      growthPlanService.subscribeToPlan(onNext, vi.fn())

      fireOnChange([
        makeSnapshotDoc('2026-09-11', {
          day: 1,
          week: 1,
          phase: '',
          theme: '',
          category: '',
          action: '',
          why: '',
          minutes: 0,
          spend: 0,
          doneWhen: '',
          // owner intentionally omitted
          status: 'pending',
          notes: '',
          completedAt: null,
          completedByEmail: '',
        }),
      ])

      const days = onNext.mock.calls[0]![0]
      expect(days[0].owner).toBe('jerson')
    })

    it('maps multiple docs in a single snapshot call', () => {
      const onNext = vi.fn()
      growthPlanService.subscribeToPlan(onNext, vi.fn())

      const baseDayData = {
        week: 1, phase: '', theme: '', category: '', action: '', why: '',
        minutes: 30, spend: 0, doneWhen: '', owner: 'jerson', status: 'pending',
        notes: '', completedAt: null, completedByEmail: '',
      }

      fireOnChange([
        makeSnapshotDoc('2026-09-01', { day: 1, ...baseDayData }),
        makeSnapshotDoc('2026-09-02', { day: 2, ...baseDayData }),
        makeSnapshotDoc('2026-09-03', { day: 3, ...baseDayData }),
      ])

      const days = onNext.mock.calls[0]![0]
      expect(days).toHaveLength(3)
      expect(days[0].date).toBe('2026-09-01')
      expect(days[1].date).toBe('2026-09-02')
      expect(days[2].date).toBe('2026-09-03')
    })
  })

  // ── setStatus ───────────────────────────────────────────────────────────

  describe('setStatus', () => {
    it('sets status to "done" with serverTimestamp and email', async () => {
      await growthPlanService.setStatus('2026-09-01', 'done', 'jerson@oqupa.com')
      expect(updateDocMock).toHaveBeenCalledOnce()
      const payload = updateDocMock.mock.calls[0]![1]
      expect(payload.status).toBe('done')
      expect(payload.completedAt).toEqual({ _server: true })
      expect(payload.completedByEmail).toBe('jerson@oqupa.com')
    })

    it('clears completedAt and completedByEmail when setting status to "pending"', async () => {
      await growthPlanService.setStatus('2026-09-01', 'pending', 'jerson@oqupa.com')
      const payload = updateDocMock.mock.calls[0]![1]
      expect(payload.status).toBe('pending')
      expect(payload.completedAt).toBeNull()
      expect(payload.completedByEmail).toBe('')
    })

    it('clears completedAt and completedByEmail when setting status to "skipped"', async () => {
      await growthPlanService.setStatus('2026-09-02', 'skipped', 'jerson@oqupa.com')
      const payload = updateDocMock.mock.calls[0]![1]
      expect(payload.status).toBe('skipped')
      expect(payload.completedAt).toBeNull()
      expect(payload.completedByEmail).toBe('')
    })

    it('passes the correct doc reference for the given date', async () => {
      await growthPlanService.setStatus('2026-09-15', 'done', 'user@oqupa.com')
      expect(docMock).toHaveBeenCalledWith(
        expect.anything(),
        'growthPlan',
        '2026-09-15',
      )
    })
  })

  // ── setNotes ────────────────────────────────────────────────────────────

  describe('setNotes', () => {
    it('calls updateDoc with the given notes', async () => {
      await growthPlanService.setNotes('2026-09-01', 'My notes here')
      expect(updateDocMock).toHaveBeenCalledOnce()
      expect(updateDocMock.mock.calls[0]![1]).toEqual({ notes: 'My notes here' })
    })

    it('truncates notes to 2000 characters', async () => {
      const longNotes = 'x'.repeat(2500)
      await growthPlanService.setNotes('2026-09-01', longNotes)
      const payload = updateDocMock.mock.calls[0]![1]
      expect(payload.notes).toHaveLength(2000)
    })

    it('keeps notes that are exactly 2000 characters unchanged', async () => {
      const notes = 'y'.repeat(2000)
      await growthPlanService.setNotes('2026-09-01', notes)
      expect(updateDocMock.mock.calls[0]![1].notes).toHaveLength(2000)
    })

    it('passes the correct doc reference for the given date', async () => {
      await growthPlanService.setNotes('2026-09-20', 'Note content')
      expect(docMock).toHaveBeenCalledWith(
        expect.anything(),
        'growthPlan',
        '2026-09-20',
      )
    })

    it('accepts empty string notes', async () => {
      await growthPlanService.setNotes('2026-09-01', '')
      expect(updateDocMock.mock.calls[0]![1]).toEqual({ notes: '' })
    })
  })
})
