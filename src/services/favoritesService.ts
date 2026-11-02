// Guardados — one store for the app and the website (ADR-046 #1): the app's
// users/{uid}/favorites, with exactly the app's document shape
// (oqupa: lib/services/3_datasources/features/favorites/favorites_firestore_datasource.dart):
//   id "{uid}_{listingId}", { listingId, createdAt: Timestamp }.
// The owner's "A alguien le gustó tu propiedad" push and the price-drop push
// read this collection (oqupa: functions/index.js onFavoriteAdded,
// onFavoritePriceDrop).
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  arrayUnion,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { planListsMove, isListingId, type OldList } from '@/lib/listsToGuardados'

/** The app's document id for a save. */
export function favoriteDocId(uid: string, listingId: string): string {
  return `${uid}_${listingId}`
}

function favoriteRef(uid: string, listingId: string) {
  return doc(db, 'users', uid, 'favorites', favoriteDocId(uid, listingId))
}

// Firestore takes at most 500 operations in one write; one is the list's mark.
const MAX_SAVES_PER_WRITE = 450

function millisOf(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value) {
    return (value as { toMillis: () => number }).toMillis()
  }
  // A save just made here, before the server has stamped it: newest.
  return Number.MAX_SAFE_INTEGER
}

export const favoritesService = {
  /** The saved listing ids, newest first. */
  subscribe(uid: string, callback: (ids: string[]) => void, onError: (error: Error) => void): Unsubscribe {
    return onSnapshot(
      collection(db, 'users', uid, 'favorites'),
      (snapshot) => {
        const saves = snapshot.docs
          .map((d) => d.data({ serverTimestamps: 'estimate' }) as Record<string, unknown>)
          .filter((data) => isListingId(data['listingId']))
          .map((data) => ({ id: data['listingId'] as string, at: millisOf(data['createdAt']) }))
          .sort((a, b) => b.at - a.at)
        callback([...new Set(saves.map((s) => s.id))])
      },
      (error) => onError(error),
    )
  },

  async add(uid: string, listingId: string): Promise<void> {
    await setDoc(favoriteRef(uid, listingId), { listingId, createdAt: serverTimestamp() })
  },

  async remove(uid: string, listingId: string): Promise<void> {
    await deleteDoc(favoriteRef(uid, listingId))
  },

  /** Several new saves at once (a visitor's device saves, on sign-in). */
  async addMany(uid: string, listingIds: string[]): Promise<void> {
    const ids = listingIds.filter(isListingId)
    for (let i = 0; i < ids.length; i += MAX_SAVES_PER_WRITE) {
      const batch = writeBatch(db)
      for (const listingId of ids.slice(i, i + MAX_SAVES_PER_WRITE)) {
        batch.set(favoriteRef(uid, listingId), { listingId, createdAt: serverTimestamp() })
      }
      await batch.commit()
    }
  },

  /**
   * Moves the saves from the website's old named lists into Guardados, once.
   * Each moved save carries `migratedFrom: 'lists'` so the owner is not told
   * "A alguien le gustó tu propiedad" about an old save. The list records what
   * moved in the same write, so nothing moves twice and nothing is lost if a
   * write fails (it is tried again at the next sign-in). Lists are never
   * deleted here. Returns how many saves were created.
   */
  async moveListsIn(uid: string, alreadySaved: Set<string>): Promise<number> {
    const snapshot = await getDocs(collection(db, 'users', uid, 'lists'))
    const lists: OldList[] = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>
      return {
        id: d.id,
        listingIds: Array.isArray(data['listingIds']) ? (data['listingIds'] as string[]) : [],
        movedListingIds: Array.isArray(data['migratedListingIds']) ? (data['migratedListingIds'] as string[]) : [],
      }
    })
    let created = 0
    for (const step of planListsMove(lists, alreadySaved)) {
      const toWrite = new Set(step.write)
      for (let i = 0; i < step.mark.length; i += MAX_SAVES_PER_WRITE) {
        const chunk = step.mark.slice(i, i + MAX_SAVES_PER_WRITE)
        const batch = writeBatch(db)
        for (const listingId of chunk) {
          if (!toWrite.has(listingId)) continue
          batch.set(favoriteRef(uid, listingId), { listingId, createdAt: serverTimestamp(), migratedFrom: 'lists' })
        }
        batch.update(doc(db, 'users', uid, 'lists', step.listId), { migratedListingIds: arrayUnion(...chunk) })
        await batch.commit()
        created += chunk.filter((id) => toWrite.has(id)).length
      }
    }
    return created
  },
}
