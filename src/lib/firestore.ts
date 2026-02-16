import { collection, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { WaitlistEntry } from '@/types/waitlist'
import type { Listing, Property } from '@/types/property'

export async function addWaitlistEntry(
  entry: Omit<WaitlistEntry, 'createdAt'>
) {
  const waitlistRef = collection(db, 'waitlist')
  return addDoc(waitlistRef, {
    ...entry,
    createdAt: serverTimestamp(),
  })
}

export async function getListingById(
  listingId: string
): Promise<Listing | null> {
  const listingRef = doc(db, 'listings', listingId)
  const snap = await getDoc(listingRef)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Listing
}

export async function getPropertyById(
  propertyId: string
): Promise<Property | null> {
  const propertyRef = doc(db, 'properties', propertyId)
  const snap = await getDoc(propertyRef)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Property
}
