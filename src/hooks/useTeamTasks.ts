import { useEffect, useMemo, useState } from 'react'
import { teamTaskService } from '@/services/teamTaskService'
import type { TeamTask } from '@/types/teamTask'
import type { TeamId } from '@/app/features/team/teamRoster'

interface UseTeamTasks {
  /** Unclaimed tasks — the shared TO DO container. Newest first. */
  todo: TeamTask[]
  /** Claimed tasks grouped by column email, already sorted for display. */
  byAssignee: Record<string, TeamTask[]>
  isLoading: boolean
  error: string | null
}

/**
 * Column order: unfinished work first (newest first), then finished work
 * (most recently finished first).
 *
 * Sorting purely by creation date would bury a freshly claimed old task under
 * a pile of completed ones, so what someone is actually working on right now
 * always sits at the top of their column.
 */
function sortForColumn(tasks: TeamTask[]): TeamTask[] {
  return [...tasks].sort((a, b) => {
    if (!a.doneAt && b.doneAt) return -1
    if (a.doneAt && !b.doneAt) return 1
    if (a.doneAt && b.doneAt) return b.doneAt.getTime() - a.doneAt.getTime()
    return b.createdAt.getTime() - a.createdAt.getTime()
  })
}

export function useTeamTasks(team: TeamId): UseTeamTasks {
  const [tasks, setTasks] = useState<TeamTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    const unsubscribe = teamTaskService.subscribe(
      team,
      (next) => {
        setTasks(next)
        setIsLoading(false)
      },
      () => {
        setError('No se pudieron cargar las tareas del equipo.')
        setIsLoading(false)
      },
    )
    return unsubscribe
  }, [team])

  const { todo, byAssignee } = useMemo(() => {
    const unclaimed: TeamTask[] = []
    const grouped: Record<string, TeamTask[]> = {}

    for (const task of tasks) {
      if (!task.assigneeEmail) {
        unclaimed.push(task)
        continue
      }
      const key = task.assigneeEmail.toLowerCase()
      ;(grouped[key] ??= []).push(task)
    }

    for (const [key, list] of Object.entries(grouped)) {
      grouped[key] = sortForColumn(list)
    }

    // The Firestore query already orders by createdAt desc, so the TO DO pile
    // is newest-first without re-sorting.
    return { todo: unclaimed, byAssignee: grouped }
  }, [tasks])

  return { todo, byAssignee, isLoading, error }
}
