// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mock the Firebase-backed service
// ---------------------------------------------------------------------------

let subscribeMock: Mock

vi.mock('@/services/teamTaskService', () => ({
  get teamTaskService() {
    return {
      subscribe: (...args: unknown[]) => subscribeMock(...args),
    }
  },
}))

import { useTeamTasks } from '../useTeamTasks'
import type { TeamTask } from '@/types/teamTask'

// ---------------------------------------------------------------------------
// Fixture helper
// ---------------------------------------------------------------------------

let taskCounter = 0

function mkTask(opts: Partial<TeamTask> = {}): TeamTask {
  const id = `task-${taskCounter++}`
  return {
    id,
    title: `Task ${id}`,
    team: 'dev',
    assigneeEmail: null,
    createdAt: new Date(2026, 0, taskCounter),
    updatedAt: new Date(2026, 0, taskCounter),
    doneAt: null,
    createdByEmail: 'creator@test.com',
    ...opts,
  } as unknown as TeamTask
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useTeamTasks', () => {
  beforeEach(() => {
    subscribeMock = vi.fn(() => () => {})
    taskCounter = 0
  })

  it('starts with isLoading=true, empty todo and byAssignee', () => {
    const { result } = renderHook(() => useTeamTasks('dev'))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.todo).toEqual([])
    expect(result.current.byAssignee).toEqual({})
    expect(result.current.error).toBeNull()
  })

  it('separates unclaimed tasks into todo', async () => {
    const tasks = [
      mkTask({ assigneeEmail: null }),
      mkTask({ assigneeEmail: null }),
      mkTask({ assigneeEmail: 'alice@test.com' }),
    ]

    subscribeMock.mockImplementation(
      (_team: string, onData: (tasks: TeamTask[]) => void) => {
        onData(tasks)
        return () => {}
      },
    )

    const { result } = renderHook(() => useTeamTasks('dev'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.todo).toHaveLength(2)
    expect(result.current.byAssignee['alice@test.com']).toHaveLength(1)
  })

  it('groups claimed tasks by assignee email (lowercase)', async () => {
    const tasks = [
      mkTask({ assigneeEmail: 'Alice@Test.com' }),
      mkTask({ assigneeEmail: 'alice@test.com' }),
      mkTask({ assigneeEmail: 'bob@test.com' }),
    ]

    subscribeMock.mockImplementation(
      (_team: string, onData: (tasks: TeamTask[]) => void) => {
        onData(tasks)
        return () => {}
      },
    )

    const { result } = renderHook(() => useTeamTasks('dev'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.byAssignee['alice@test.com']).toHaveLength(2)
    expect(result.current.byAssignee['bob@test.com']).toHaveLength(1)
  })

  it('sorts columns: in-progress tasks before done tasks', async () => {
    const doneAt = new Date(2026, 5, 1)
    const tasks = [
      mkTask({ assigneeEmail: 'alice@test.com', doneAt, createdAt: new Date(2026, 0, 1) }),
      mkTask({ assigneeEmail: 'alice@test.com', doneAt: null, createdAt: new Date(2026, 0, 2) }),
    ]

    subscribeMock.mockImplementation(
      (_team: string, onData: (tasks: TeamTask[]) => void) => {
        onData(tasks)
        return () => {}
      },
    )

    const { result } = renderHook(() => useTeamTasks('dev'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const col = result.current.byAssignee['alice@test.com']!
    // In-progress task (no doneAt) should come first
    expect(col[0]!.doneAt).toBeNull()
    expect(col[1]!.doneAt).toBe(doneAt)
  })

  it('sorts done tasks by doneAt descending (most recently done first)', async () => {
    const doneAt1 = new Date(2026, 5, 10)
    const doneAt2 = new Date(2026, 5, 1)
    const tasks = [
      mkTask({ assigneeEmail: 'bob@test.com', doneAt: doneAt2 }),
      mkTask({ assigneeEmail: 'bob@test.com', doneAt: doneAt1 }),
    ]

    subscribeMock.mockImplementation(
      (_team: string, onData: (tasks: TeamTask[]) => void) => {
        onData(tasks)
        return () => {}
      },
    )

    const { result } = renderHook(() => useTeamTasks('dev'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const col = result.current.byAssignee['bob@test.com']!
    expect(col[0]!.doneAt).toBe(doneAt1)
    expect(col[1]!.doneAt).toBe(doneAt2)
  })

  it('sorts in-progress tasks by createdAt descending (newest first)', async () => {
    const older = new Date(2026, 0, 1)
    const newer = new Date(2026, 5, 15)
    const tasks = [
      mkTask({ assigneeEmail: 'alice@test.com', doneAt: null, createdAt: older }),
      mkTask({ assigneeEmail: 'alice@test.com', doneAt: null, createdAt: newer }),
    ]

    subscribeMock.mockImplementation(
      (_team: string, onData: (tasks: TeamTask[]) => void) => {
        onData(tasks)
        return () => {}
      },
    )

    const { result } = renderHook(() => useTeamTasks('dev'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const col = result.current.byAssignee['alice@test.com']!
    expect(col[0]!.createdAt).toBe(newer)
    expect(col[1]!.createdAt).toBe(older)
  })

  it('sets error when the service fires the error callback', async () => {
    subscribeMock.mockImplementation(
      (_team: string, _onData: unknown, onError: () => void) => {
        onError()
        return () => {}
      },
    )

    const { result } = renderHook(() => useTeamTasks('dev'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.error).not.toBeNull()
    expect(result.current.todo).toEqual([])
    expect(result.current.byAssignee).toEqual({})
  })

  it('re-subscribes when the team changes', async () => {
    subscribeMock.mockImplementation(() => () => {})

    const { rerender } = renderHook(
      ({ team }: { team: 'dev' }) => useTeamTasks(team),
      { initialProps: { team: 'dev' as const } },
    )

    expect(subscribeMock).toHaveBeenCalledTimes(1)
    rerender({ team: 'dev' })
    // Same team — no re-subscription
    expect(subscribeMock).toHaveBeenCalledTimes(1)
  })

  it('passes the team to the service subscription', async () => {
    subscribeMock.mockImplementation(() => () => {})

    renderHook(() => useTeamTasks('dev'))

    expect(subscribeMock).toHaveBeenCalledWith('dev', expect.any(Function), expect.any(Function))
  })
})
