/**
 * One day of the six-week growth plan (`/app/contenido`, Plan view).
 *
 * Firestore path: `growthPlan/{YYYY-MM-DD}` — the date IS the document id, so a
 * day can never be duplicated and the seed is naturally idempotent.
 *
 * The content fields (action, why, minutes...) are written by the seed from
 * `planContent.ts`. The progress fields (status, notes) are written by whoever
 * is working the plan, and the seed must never overwrite them.
 */

import type { PlanOwner } from '@/app/features/plan/planContent'

export type PlanStatus = 'pending' | 'done' | 'skipped'

export interface GrowthPlanDay {
  /** YYYY-MM-DD, and the Firestore document id. */
  date: string
  day: number
  week: number
  phase: string
  theme: string
  category: string
  action: string
  why: string
  minutes: number
  doneWhen: string
  spend: number
  owner: PlanOwner

  // ----- progress, owned by the person doing the work -----
  status: PlanStatus
  notes: string
  completedAt: Date | null
  completedByEmail: string
}
