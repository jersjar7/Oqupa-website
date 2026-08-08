import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ContentLink } from '@/types/contentLink'

const COLLECTION = 'contentLinks'

function linksCol() {
  return collection(db, COLLECTION)
}

function linkRef(id: string) {
  return doc(db, COLLECTION, id)
}

function toDate(value: unknown): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  const ts = value as { toDate?: () => Date }
  return typeof ts.toDate === 'function' ? ts.toDate() : null
}

function docToLink(id: string, data: Record<string, unknown>): ContentLink {
  return {
    id,
    date: String(data['date'] ?? ''),
    // Absent on every link created before labels existed — the UI falls back
    // to the address rather than rendering an empty row.
    label: data['label'] === undefined ? undefined : String(data['label']),
    url: String(data['url'] ?? ''),
    // The optimistic local snapshot fires before the server stamps createdAt.
    createdAt: toDate(data['createdAt']) ?? new Date(),
    createdByEmail: String(data['createdByEmail'] ?? ''),
  }
}

export const contentLinkService = {
  /**
   * Live subscription to one month.
   *
   * Range-filtered and ordered on the SAME field (`date`), which Firestore
   * serves from its automatic single-field index — no composite index to
   * deploy, and therefore nothing to forget. That is deliberate: the team
   * board shipped broken once because its composite index was not deployed
   * alongside its rules.
   */
  subscribeToMonth(
    monthStart: string,
    monthEnd: string,
    onChange: (links: ContentLink[]) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    const q = query(
      linksCol(),
      where('date', '>=', monthStart),
      where('date', '<=', monthEnd),
      orderBy('date', 'asc'),
    )
    return onSnapshot(
      q,
      (snap) => onChange(snap.docs.map((d) => docToLink(d.id, d.data()))),
      onError,
    )
  },

  async create(params: {
    date: string
    label: string
    url: string
    createdByEmail: string
  }): Promise<void> {
    await addDoc(linksCol(), {
      date: params.date,
      label: params.label,
      url: params.url,
      createdAt: serverTimestamp(),
      createdByEmail: params.createdByEmail,
    })
  },

  /** Label and address are edited together — they describe the same thing. */
  async update(id: string, fields: { label: string; url: string }): Promise<void> {
    await updateDoc(linkRef(id), { label: fields.label, url: fields.url })
  },

  async remove(id: string): Promise<void> {
    await deleteDoc(linkRef(id))
  },
}
