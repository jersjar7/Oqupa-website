import { collection, doc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import type { WaitlistEntry } from '@/types/waitlist'
import type { ListingFirestoreDoc } from '@/types/listing'
import type { PropertyFirestoreDoc } from '@/types/property'

export async function addWaitlistEntry(
  entry: Omit<WaitlistEntry, 'createdAt'>
) {
  const waitlistRef = collection(db, 'waitlist')
  const docRef = await addDoc(waitlistRef, {
    ...entry,
    createdAt: serverTimestamp(),
  })

  // Queue notification email via Firebase Trigger Email extension.
  // Requires installing "Trigger Email from Firestore" extension in Firebase console
  // and configuring it to watch the "mail" collection with an SMTP transport.
  const mailRef = collection(db, 'mail')
  await addDoc(mailRef, {
    to: 'admin@oqupa.com',
    message: {
      subject: `Nueva inscripcion en lista de espera: ${entry.name}`,
      html: `
        <h2>Nueva inscripcion en la lista de espera</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;">
          <tr><td style="padding:8px;font-weight:bold;">Nombre:</td><td style="padding:8px;">${entry.name}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;">Email:</td><td style="padding:8px;">${entry.email}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;">Interes:</td><td style="padding:8px;">${entry.intent}</td></tr>
        </table>
      `,
    },
  })

  return docRef
}

export type ListingDoc = ListingFirestoreDoc & { id: string }
export type PropertyDoc = PropertyFirestoreDoc & { id: string }

export async function getListingById(
  listingId: string
): Promise<ListingDoc | null> {
  const listingRef = doc(db, 'listings', listingId)
  const snap = await getDoc(listingRef)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as ListingDoc
}

export async function getPropertyById(
  propertyId: string
): Promise<PropertyDoc | null> {
  const propertyRef = doc(db, 'properties', propertyId)
  const snap = await getDoc(propertyRef)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as PropertyDoc
}
