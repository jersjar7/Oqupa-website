import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { TeamTask } from '@/types/teamTask'
import type { TeamId } from '@/app/features/team/teamRoster'

const COLLECTION = 'teamTasks'

function tasksCol() {
  return collection(db, COLLECTION)
}

function taskRef(taskId: string) {
  return doc(db, COLLECTION, taskId)
}

/** Firestore Timestamp | null → Date | null, tolerant of pending server writes. */
function toDate(raw: unknown): Date | null {
  if (raw && typeof raw === 'object' && 'toDate' in raw) {
    return (raw as { toDate: () => Date }).toDate()
  }
  return null
}

function docToTask(id: string, data: Record<string, unknown>): TeamTask {
  return {
    id,
    title: String(data['title'] ?? ''),
    team: (data['team'] as TeamId) ?? 'dev',
    assigneeEmail: (data['assigneeEmail'] as string | null) ?? null,
    // An optimistic local snapshot fires before the server stamps createdAt.
    // Fall back to "now" so a just-added task still sorts to the top instead of
    // jumping position a moment later.
    createdAt: toDate(data['createdAt']) ?? new Date(),
    claimedAt: toDate(data['claimedAt']),
    doneAt: toDate(data['doneAt']),
    createdByEmail: String(data['createdByEmail'] ?? ''),
  }
}

export const teamTaskService = {
  /**
   * Live subscription to one board. Realtime rather than a one-shot read so
   * teammates see each other claim and finish work without refreshing.
   */
  subscribe(
    team: TeamId,
    onChange: (tasks: TeamTask[]) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    const q = query(
      tasksCol(),
      where('team', '==', team),
      orderBy('createdAt', 'desc'),
    )
    return onSnapshot(
      q,
      (snap) => onChange(snap.docs.map((d) => docToTask(d.id, d.data()))),
      onError,
    )
  },

  /**
   * Create a task. Passing `assigneeEmail` drops it straight into that
   * person's column (for work that was never on the shared list); passing null
   * adds it to the shared TO DO container.
   */
  async create(params: {
    title: string
    team: TeamId
    assigneeEmail: string | null
    createdByEmail: string
  }): Promise<void> {
    await addDoc(tasksCol(), {
      title: params.title,
      team: params.team,
      assigneeEmail: params.assigneeEmail,
      createdAt: serverTimestamp(),
      claimedAt: params.assigneeEmail ? serverTimestamp() : null,
      doneAt: null,
      createdByEmail: params.createdByEmail,
    })
  },

  /** Move a task into someone's column (or back to TO DO with null). */
  async assign(taskId: string, assigneeEmail: string | null): Promise<void> {
    await updateDoc(taskRef(taskId), {
      assigneeEmail,
      claimedAt: assigneeEmail ? serverTimestamp() : null,
      // Sending an item back to the shared list also reopens it — an unclaimed
      // task that still carried a done stamp would render as finished work
      // owned by nobody.
      ...(assigneeEmail ? {} : { doneAt: null }),
    })
  },

  /** Mark finished (stamps doneAt) or reopen (clears it). */
  async setDone(taskId: string, done: boolean): Promise<void> {
    await updateDoc(taskRef(taskId), {
      doneAt: done ? serverTimestamp() : null,
    })
  },

  async rename(taskId: string, title: string): Promise<void> {
    await updateDoc(taskRef(taskId), { title })
  },

  async remove(taskId: string): Promise<void> {
    await deleteDoc(taskRef(taskId))
  },
}
