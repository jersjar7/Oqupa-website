import { useEffect, useMemo, useState } from 'react'
import { teamTaskService } from '@/services/teamTaskService'
import type { TeamTask } from '@/types/teamTask'
import type { TeamId } from '@/app/features/team/teamRoster'
import { sortForColumn, splitTodo } from '@/app/features/team/taskOrder'

interface UseTeamTasks {
  /** Unclaimed tasks — the shared TO DO container. Newest first. */
  todo: TeamTask[]
  /** The shared list to work from now: Alta, then Normal. */
  now: TeamTask[]
  /** The shared "Cuando haya tiempo" bucket (tech debt, bugs). */
  later: TeamTask[]
  /** Claimed tasks grouped by column email, already sorted for display. */
  byAssignee: Record<string, TeamTask[]>
  isLoading: boolean
  error: string | null
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

  const { now, later } = useMemo(() => splitTodo(todo), [todo])

  return { todo, now, later, byAssignee, isLoading, error }
}
