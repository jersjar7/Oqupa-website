import {
  collection,
  doc,
  addDoc,
  updateDoc,
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

  async addListing(uid: string, listId: string, listingId: string): Promise<void> {
    await updateDoc(listDocRef(uid, listId), { listingIds: arrayUnion(listingId) })
  },

  async removeListing(uid: string, listId: string, listingId: string): Promise<void> {
    await updateDoc(listDocRef(uid, listId), { listingIds: arrayRemove(listingId) })
  },
}
