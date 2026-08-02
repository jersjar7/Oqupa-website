import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { GrowthPlanDay, PlanStatus } from '@/types/growthPlan'
import type { PlanOwner } from '@/app/features/plan/planContent'

const COLLECTION = 'growthPlan'

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  const ts = value as { toDate?: () => Date }
  return typeof ts.toDate === 'function' ? ts.toDate() : null
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}
function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function docToDay(id: string, data: Record<string, unknown>): GrowthPlanDay {
  const rawStatus = str(data['status'], 'pending')
  return {
    date: id,
    day: num(data['day']),
    week: num(data['week']),
    phase: str(data['phase']),
    theme: str(data['theme']),
    category: str(data['category']),
    action: str(data['action']),
    why: str(data['why']),
    minutes: num(data['minutes']),
    spend: num(data['spend']),
    doneWhen: str(data['doneWhen']),
    owner: (str(data['owner'], 'jerson') as PlanOwner) ?? 'jerson',
    status: (['pending', 'done', 'skipped'] as const).includes(
      rawStatus as PlanStatus,
    )
      ? (rawStatus as PlanStatus)
      : 'pending',
    notes: str(data['notes']),
    completedAt: toDate(data['completedAt']),
    completedByEmail: str(data['completedByEmail']),
  }
}

export const growthPlanService = {
  /**
   * Live subscription to the whole plan.
   *
   * The plan is 42 documents, so it is read whole and ordered by the document
   * id (the date). Ordering on `__name__` needs no index at all.
   */
  subscribeToPlan(
    onNext: (days: GrowthPlanDay[]) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    const q = query(collection(db, COLLECTION), orderBy('__name__'))
    return onSnapshot(
      q,
      (snap) => onNext(snap.docs.map((d) => docToDay(d.id, d.data()))),
      onError,
    )
  },

  /**
   * Mark a day done, pending or skipped.
   *
   * `completedAt` is cleared when moving back to pending so a day cannot claim
   * a completion time it no longer has.
   */
  async setStatus(
    date: string,
    status: PlanStatus,
    email: string,
  ): Promise<void> {
    await updateDoc(doc(db, COLLECTION, date), {
      status,
      completedAt: status === 'done' ? serverTimestamp() : null,
      completedByEmail: status === 'done' ? email : '',
    })
  },

  /** Save the note for a day. Notes are kept whatever the status. */
  async setNotes(date: string, notes: string): Promise<void> {
    await updateDoc(doc(db, COLLECTION, date), { notes: notes.slice(0, 2000) })
  },
}
