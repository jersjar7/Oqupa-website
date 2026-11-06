import { describe, it, expect } from 'vitest'
import { priorityOf, sortForColumn, splitTodo, PRIORITY_LABELS } from '../taskOrder'
import type { TeamTask } from '@/types/teamTask'

// Equipo board, meeting of 2026-11-05: tasks carry a priority so the shared
// list says what to take first, and a "Cuando haya tiempo" bucket (tech debt,
// bugs) so there is always something to pick up.

let n = 0
function task(opts: Partial<TeamTask> = {}): TeamTask {
  n++
  return {
    id: `t${n}`, title: `T${n}`, team: 'dev', assigneeEmail: null,
    createdAt: new Date(2026, 0, n), claimedAt: null, doneAt: null, createdByEmail: 'a@b.c',
    ...opts,
  }
}

describe('priorityOf', () => {
  it('a task written before priorities existed is Normal', () => {
    expect(priorityOf(task())).toBe('normal')
  })
  it('an unknown value is Normal too', () => {
    expect(priorityOf(task({ priority: 'urgent' as never }))).toBe('normal')
  })
  it('labels in Spanish', () => {
    expect(PRIORITY_LABELS).toEqual({ alta: 'Alta', normal: 'Normal', luego: 'Cuando haya tiempo' })
  })
})

describe('splitTodo', () => {
  it('Alta first, then Normal, each newest first; Cuando haya tiempo apart', () => {
    const oldNormal = task()
    const later = task({ priority: 'luego' })
    const oldAlta = task({ priority: 'alta' })
    const newNormal = task()
    const newAlta = task({ priority: 'alta' })
    const { now, later: bucket } = splitTodo([oldNormal, later, oldAlta, newNormal, newAlta])
    expect(now.map((t) => t.id)).toEqual([newAlta.id, oldAlta.id, newNormal.id, oldNormal.id])
    expect(bucket.map((t) => t.id)).toEqual([later.id])
  })
})

describe('sortForColumn', () => {
  it('unfinished first — Alta on top — then finished, most recently finished first', () => {
    const normal = task({ assigneeEmail: 'x' })
    const alta = task({ assigneeEmail: 'x', priority: 'alta' })
    const doneOld = task({ assigneeEmail: 'x', doneAt: new Date(2026, 1, 1) })
    const doneNew = task({ assigneeEmail: 'x', doneAt: new Date(2026, 1, 5) })
    const luego = task({ assigneeEmail: 'x', priority: 'luego' })
    expect(sortForColumn([doneOld, normal, luego, doneNew, alta]).map((t) => t.id)).toEqual([
      alta.id, normal.id, luego.id, doneNew.id, doneOld.id,
    ])
  })
})
