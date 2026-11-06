import type { TeamId } from '@/app/features/team/teamRoster'

/**
 * A single item on the internal team board (`/app/equipo`).
 *
 * There is no explicit status field — where a task renders is derived from two
 * pieces of data, so the two can never disagree:
 *
 *   assigneeEmail === null   → the shared TO DO container (nobody has it)
 *   assigneeEmail && !doneAt → "working on" inside that person's column
 *   doneAt                   → "finished" inside that person's column
 */
export interface TeamTask {
  id: string
  title: string
  team: TeamId
  /** Canonical column email of whoever owns it, or null while unclaimed. */
  assigneeEmail: string | null
  createdAt: Date
  /** When it entered someone's column. Null while unclaimed. */
  claimedAt: Date | null
  /** When it was marked finished. Null while still in progress. */
  doneAt: Date | null
  createdByEmail: string
  /** Meeting 2026-11-05. Missing on older tasks, which read as 'normal'. */
  priority?: TaskPriority
  /** Longer explanation under the title: what it means, how to do it. */
  description?: string
}

/** 'luego' = "Cuando haya tiempo": tech debt, bugs, nice-to-haves. */
export type TaskPriority = 'alta' | 'normal' | 'luego'
