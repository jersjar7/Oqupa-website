// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  addDocMock, updateDocMock, deleteDocMock, onSnapshotMock,
  queryMock, collectionMock, docMock, whereMock, orderByMock,
} = vi.hoisted(() => ({
  addDocMock: vi.fn().mockResolvedValue({ id: 'new-task-id' }),
  updateDocMock: vi.fn().mockResolvedValue(undefined),
  deleteDocMock: vi.fn().mockResolvedValue(undefined),
  onSnapshotMock: vi.fn(() => vi.fn()),
  queryMock: vi.fn((...args: unknown[]) => ({ __query: args })),
  collectionMock: vi.fn(() => ({ __col: 'teamTasks' })),
  docMock: vi.fn((_db: unknown, col: string, id: string) => ({ path: `${col}/${id}` })),
  whereMock: vi.fn(() => ({ __where: true })),
  orderByMock: vi.fn(() => ({ __orderBy: true })),
}))

vi.mock('firebase/firestore', () => ({
  addDoc: (...args: unknown[]) => addDocMock(...args),
  collection: (...args: unknown[]) => collectionMock(...args),
  deleteDoc: (...args: unknown[]) => deleteDocMock(...args),
  doc: (...args: unknown[]) => docMock(...args),
  onSnapshot: (...args: unknown[]) => onSnapshotMock(...args),
  orderBy: (...args: unknown[]) => orderByMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
  serverTimestamp: vi.fn(() => ({ _server: true })),
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  where: (...args: unknown[]) => whereMock(...args),
}))

vi.mock('@/lib/firebase', () => ({ db: { __fakeDb: true } }))

import { teamTaskService } from '../teamTaskService'

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

describe('teamTaskService', () => {
  beforeEach(() => {
    addDocMock.mockReset().mockResolvedValue({ id: 'new-task-id' })
    updateDocMock.mockReset().mockResolvedValue(undefined)
    deleteDocMock.mockReset().mockResolvedValue(undefined)
    onSnapshotMock.mockReset().mockReturnValue(vi.fn())
    queryMock.mockReset().mockReturnValue({ __query: true })
    collectionMock.mockReset().mockReturnValue({ __col: true })
    whereMock.mockReset().mockReturnValue({ __where: true })
    orderByMock.mockReset().mockReturnValue({ __orderBy: true })
  })

  // ── subscribe ───────────────────────────────────────────────────────────

  describe('subscribe', () => {
    it('returns an unsubscribe function', () => {
      const unsubFn = vi.fn()
      onSnapshotMock.mockReturnValue(unsubFn)
      const unsub = teamTaskService.subscribe('dev', vi.fn(), vi.fn())
      expect(unsub).toBe(unsubFn)
    })

    it('queries for the correct team with createdAt DESC ordering', () => {
      teamTaskService.subscribe('dev', vi.fn(), vi.fn())
      expect(whereMock).toHaveBeenCalledWith('team', '==', 'dev')
      expect(orderByMock).toHaveBeenCalledWith('createdAt', 'desc')
    })

    it('queries for marketing team', () => {
      teamTaskService.subscribe('marketing', vi.fn(), vi.fn())
      expect(whereMock).toHaveBeenCalledWith('team', '==', 'marketing')
    })

    it('maps Firestore docs to TeamTask objects and calls onChange', () => {
      const onChange = vi.fn()
      teamTaskService.subscribe('dev', onChange, vi.fn())

      fireOnChange([
        makeSnapshotDoc('task-1', {
          title: 'Fix login bug',
          team: 'dev',
          assigneeEmail: 'dev@oqupa.com',
          createdAt: { toDate: () => new Date('2026-09-01') },
          claimedAt: { toDate: () => new Date('2026-09-02') },
          doneAt: null,
          createdByEmail: 'lead@oqupa.com',
        }),
      ])

      expect(onChange).toHaveBeenCalledOnce()
      const tasks = onChange.mock.calls[0][0]
      expect(tasks).toHaveLength(1)
      expect(tasks[0]!.id).toBe('task-1')
      expect(tasks[0]!.title).toBe('Fix login bug')
      expect(tasks[0]!.team).toBe('dev')
      expect(tasks[0]!.assigneeEmail).toBe('dev@oqupa.com')
      expect(tasks[0]!.doneAt).toBeNull()
    })

    it('calls onError when Firestore fires an error', () => {
      const onError = vi.fn()
      teamTaskService.subscribe('dev', vi.fn(), onError)
      const error = new Error('permission-denied')
      fireOnError(error)
      expect(onError).toHaveBeenCalledWith(error)
    })

    it('sets assigneeEmail to null when absent from doc', () => {
      const onChange = vi.fn()
      teamTaskService.subscribe('dev', onChange, vi.fn())
      fireOnChange([
        makeSnapshotDoc('task-2', {
          title: 'Unassigned task',
          team: 'dev',
          // assigneeEmail intentionally omitted
          createdAt: null,
          claimedAt: null,
          doneAt: null,
          createdByEmail: '',
        }),
      ])
      const tasks = onChange.mock.calls[0][0]
      expect(tasks[0]!.assigneeEmail).toBeNull()
    })

    it('falls back to new Date() for createdAt when missing', () => {
      const onChange = vi.fn()
      teamTaskService.subscribe('dev', onChange, vi.fn())
      fireOnChange([
        makeSnapshotDoc('task-3', {
          title: 'Task without createdAt',
          team: 'dev',
          assigneeEmail: null,
          createdAt: null, // pending server write
          claimedAt: null,
          doneAt: null,
          createdByEmail: '',
        }),
      ])
      const tasks = onChange.mock.calls[0][0]
      expect(tasks[0]!.createdAt).toBeInstanceOf(Date)
    })

    it('converts Firestore Timestamp doneAt to Date when present', () => {
      const doneDate = new Date('2026-09-05T12:00:00Z')
      const onChange = vi.fn()
      teamTaskService.subscribe('dev', onChange, vi.fn())
      fireOnChange([
        makeSnapshotDoc('task-4', {
          title: 'Done task',
          team: 'dev',
          assigneeEmail: 'dev@oqupa.com',
          createdAt: null,
          claimedAt: null,
          doneAt: { toDate: () => doneDate },
          createdByEmail: '',
        }),
      ])
      const tasks = onChange.mock.calls[0][0]
      expect(tasks[0]!.doneAt).toEqual(doneDate)
    })
  })

  // ── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('calls addDoc with title, team, assigneeEmail, createdByEmail, and serverTimestamps', async () => {
      await teamTaskService.create({
        title: 'Fix navbar bug',
        team: 'dev',
        assigneeEmail: null,
        createdByEmail: 'lead@oqupa.com',
      })
      expect(addDocMock).toHaveBeenCalledOnce()
      const payload = addDocMock.mock.calls[0][1]
      expect(payload.title).toBe('Fix navbar bug')
      expect(payload.team).toBe('dev')
      expect(payload.assigneeEmail).toBeNull()
      expect(payload.createdByEmail).toBe('lead@oqupa.com')
      expect(payload.doneAt).toBeNull()
    })

    it('sets claimedAt to serverTimestamp when assigned directly', async () => {
      await teamTaskService.create({
        title: 'Assigned task',
        team: 'dev',
        assigneeEmail: 'dev@oqupa.com',
        createdByEmail: 'lead@oqupa.com',
      })
      const payload = addDocMock.mock.calls[0][1]
      expect(payload.claimedAt).toEqual({ _server: true })
    })

    it('sets claimedAt to null when not assigned', async () => {
      await teamTaskService.create({
        title: 'Unassigned task',
        team: 'dev',
        assigneeEmail: null,
        createdByEmail: 'lead@oqupa.com',
      })
      const payload = addDocMock.mock.calls[0][1]
      expect(payload.claimedAt).toBeNull()
    })
  })

  // ── assign ──────────────────────────────────────────────────────────────

  describe('assign', () => {
    it('sets assigneeEmail and claimedAt when assigning to someone', async () => {
      await teamTaskService.assign('task-1', 'dev@oqupa.com')
      expect(updateDocMock).toHaveBeenCalledOnce()
      const payload = updateDocMock.mock.calls[0][1]
      expect(payload.assigneeEmail).toBe('dev@oqupa.com')
      expect(payload.claimedAt).toEqual({ _server: true })
    })

    it('clears assigneeEmail, claimedAt, and doneAt when returning to shared list', async () => {
      await teamTaskService.assign('task-1', null)
      const payload = updateDocMock.mock.calls[0][1]
      expect(payload.assigneeEmail).toBeNull()
      expect(payload.claimedAt).toBeNull()
      expect(payload.doneAt).toBeNull()
    })

    it('does NOT include doneAt when assigning to someone (only clears on unassign)', async () => {
      await teamTaskService.assign('task-1', 'dev@oqupa.com')
      const payload = updateDocMock.mock.calls[0][1]
      expect(Object.keys(payload)).not.toContain('doneAt')
    })
  })

  // ── setDone ─────────────────────────────────────────────────────────────

  describe('setDone', () => {
    it('sets doneAt to serverTimestamp when done=true', async () => {
      await teamTaskService.setDone('task-1', true)
      expect(updateDocMock.mock.calls[0][1]).toEqual({ doneAt: { _server: true } })
    })

    it('sets doneAt to null when done=false (reopen)', async () => {
      await teamTaskService.setDone('task-1', false)
      expect(updateDocMock.mock.calls[0][1]).toEqual({ doneAt: null })
    })
  })

  // ── rename ──────────────────────────────────────────────────────────────

  describe('rename', () => {
    it('calls updateDoc with the new title', async () => {
      await teamTaskService.rename('task-1', 'Updated task title')
      expect(updateDocMock.mock.calls[0][1]).toEqual({ title: 'Updated task title' })
    })
  })

  // ── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('calls deleteDoc for the given task id', async () => {
      await teamTaskService.remove('task-1')
      expect(deleteDocMock).toHaveBeenCalledOnce()
    })
  })
})
