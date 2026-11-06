import type { TaskPriority, TeamTask } from '@/types/teamTask'

/**
 * Ordering for the Equipo board (meeting of 2026-11-05): a priority on every
 * task so the shared list says what to take first, and a "Cuando haya tiempo"
 * bucket — tech debt, bugs — so there is always something to pick up.
 */

export const PRIORITIES: TaskPriority[] = ['alta', 'normal', 'luego']

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  alta: 'Alta',
  normal: 'Normal',
  luego: 'Cuando haya tiempo',
}

const RANK: Record<TaskPriority, number> = { alta: 0, normal: 1, luego: 2 }

/** Tasks written before priorities existed (or with a stray value) are Normal. */
export function priorityOf(task: TeamTask): TaskPriority {
  return task.priority && task.priority in RANK ? task.priority : 'normal'
}

function byPriorityThenNewest(a: TeamTask, b: TeamTask): number {
  return RANK[priorityOf(a)] - RANK[priorityOf(b)] || b.createdAt.getTime() - a.createdAt.getTime()
}

/** The shared list: Alta then Normal (newest first); "Cuando haya tiempo" apart. */
export function splitTodo(tasks: TeamTask[]): { now: TeamTask[]; later: TeamTask[] } {
  const now = tasks.filter((t) => priorityOf(t) !== 'luego').sort(byPriorityThenNewest)
  const later = tasks.filter((t) => priorityOf(t) === 'luego').sort(byPriorityThenNewest)
  return { now, later }
}

/**
 * A person's column: unfinished work first (Alta on top, then newest), then
 * finished work, most recently finished first — so what someone is working on
 * right now always sits at the top.
 */
export function sortForColumn(tasks: TeamTask[]): TeamTask[] {
  return [...tasks].sort((a, b) => {
    if (!a.doneAt && b.doneAt) return -1
    if (a.doneAt && !b.doneAt) return 1
    if (a.doneAt && b.doneAt) return b.doneAt.getTime() - a.doneAt.getTime()
    return byPriorityThenNewest(a, b)
  })
}
