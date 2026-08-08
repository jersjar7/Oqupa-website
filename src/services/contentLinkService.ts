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
  const rawDate = data['date']
  return {
    id,
    // Anything that is not a real date string means "not scheduled" — null,
    // missing, or the empty string a hand-edit could leave behind.
    date: typeof rawDate === 'string' && rawDate ? rawDate : null,
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

  /**
   * Everything not yet scheduled, live.
   *
   * Deliberately NOT ordered in the query. `where(date == null)` combined with
   * `orderBy(createdAt)` needs a composite index, and a forgotten index is
   * exactly what shipped the team board broken on 2026-08-01 — the page loaded,
   * then failed with a permissions error that had nothing to do with
   * permissions. The shelf holds tens of items, so the caller sorts them.
   */
  subscribeToShelf(
    onChange: (links: ContentLink[]) => void,
    onError: (error: Error) => void,
  ): Unsubscribe {
    return onSnapshot(
      query(linksCol(), where('date', '==', null)),
      (snap) => onChange(snap.docs.map((d) => docToLink(d.id, d.data()))),
      onError,
    )
  },

  async create(params: {
    /** A day on the calendar, or null to put it on the shelf. */
    date: string | null
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

  /** Move material onto a day, or back onto the shelf with null. */
  async setDate(id: string, date: string | null): Promise<void> {
    await updateDoc(linkRef(id), { date })
  },

  /** Label and address are edited together — they describe the same thing. */
  async update(id: string, fields: { label: string; url: string }): Promise<void> {
    await updateDoc(linkRef(id), { label: fields.label, url: fields.url })
  },

  async remove(id: string): Promise<void> {
    await deleteDoc(linkRef(id))
  },
}
