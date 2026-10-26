import {
  collection,
  doc,
  addDoc,
  updateDoc,
  runTransaction,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  type Unsubscribe,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { UserList } from '@/types/userList'

const DEFAULT_LIST_ID = 'guardados'

function listsCol(uid: string) {
  return collection(db, 'users', uid, 'lists')
}

function listDocRef(uid: string, listId: string) {
  return doc(db, 'users', uid, 'lists', listId)
}

function docToList(id: string, data: Record<string, unknown>): UserList {
  const raw = data['createdAt']
  let createdAt = new Date()
  if (raw && typeof raw === 'object' && 'toDate' in raw) {
    createdAt = (raw as Timestamp).toDate()
  }
  return {
    id,
    name: (data['name'] as string) ?? 'Lista',
    listingIds: (data['listingIds'] as string[]) ?? [],
    isDefault: (data['isDefault'] as boolean) ?? false,
    createdAt,
  }
}

export const listService = {
  subscribe(uid: string, callback: (lists: UserList[]) => void): Unsubscribe {
    const q = query(listsCol(uid), orderBy('createdAt', 'asc'))
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map((d) => docToList(d.id, d.data() as Record<string, unknown>)))
    })
  },

  async createList(uid: string, name: string, isDefault = false): Promise<string> {
    const ref = await addDoc(listsCol(uid), {
      name,
      listingIds: [],
      isDefault,
      createdAt: serverTimestamp(),
    })
    return ref.id
  },

  async deleteList(uid: string, listId: string): Promise<void> {
    await deleteDoc(listDocRef(uid, listId))
  },

  async renameList(uid: string, listId: string, name: string): Promise<void> {
    await updateDoc(listDocRef(uid, listId), { name })
  },

  /** The default "Guardados" list, made only if missing. A fixed id, so two
   *  tabs signing in at once end up with one list, not two (hostile review
   *  2026-10-25). Returns its id. */
  async ensureDefaultList(uid: string): Promise<string> {
    const ref = listDocRef(uid, DEFAULT_LIST_ID)
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref)
      if (!snap.exists()) {
        tx.set(ref, { name: 'Guardados', listingIds: [], isDefault: true, createdAt: serverTimestamp() })
      }
    })
    return DEFAULT_LIST_ID
  },

  /** Several listings at once (a visitor's device saves, on sign-in). A
   *  listing already in the list is kept once. */
  async addListings(uid: string, listId: string, listingIds: string[]): Promise<void> {
    if (listingIds.length === 0) return
    await updateDoc(listDocRef(uid, listId), { listingIds: arrayUnion(...listingIds) })
  },

  async addListing(uid: string, listId: string, listingId: string): Promise<void> {
    await updateDoc(listDocRef(uid, listId), { listingIds: arrayUnion(listingId) })
  },

  async removeListing(uid: string, listId: string, listingId: string): Promise<void> {
    await updateDoc(listDocRef(uid, listId), { listingIds: arrayRemove(listingId) })
  },
}
