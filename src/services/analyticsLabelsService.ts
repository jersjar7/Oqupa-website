import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { AnalyticsLogger } from '@/lib/analytics'

/**
 * A signed-in person's user-group labels, copied into Google Analytics as user
 * properties so every event can be split by group (metrics plan A12c, N10).
 *
 * The server works them out each night (oqupa functions/lib/analytics-labels.js)
 * and stores them at `analyticsLabels/{uid}`, a doc only that person may read
 * and no client writes. They can be up to a day old.
 *
 *   userSegment  — every group they are in, comma-separated in a fixed order
 *                  (`seller,landlord,realtor,buyer,renter`), or `browser`
 *   homeDistrict — where they are active, never where they live; may be null
 *   isRealtor    — in the Realtor group
 *
 * Same as the app's AnalyticsLabelsService.
 */
export const ANALYTICS_LABELS_COLLECTION = 'analyticsLabels'

type ReadLabels = (uid: string) => Promise<Record<string, unknown> | null>

const readFromFirestore: ReadLabels = async (uid) => {
  const snap = await getDoc(doc(db, ANALYTICS_LABELS_COLLECTION, uid))
  return snap.exists() ? snap.data() : null
}

/**
 * Never throws. The labels are never shown to the user, and this site goes
 * live before the rule that lets it read them: no doc yet, a refused read or
 * no network all simply set nothing.
 */
export async function applyAnalyticsLabels(
  uid: string,
  {
    read = readFromFirestore,
    isStillSignedIn,
  }: {
    read?: ReadLabels
    /** Asked once the read is back: by then someone else may be signed in. */
    isStillSignedIn?: () => boolean
  } = {},
): Promise<void> {
  try {
    const labels = await read(uid)
    if (!labels) return
    if (isStillSignedIn && !isStillSignedIn()) return
    const { userSegment, homeDistrict, isRealtor } = labels
    // A field of the wrong type is left out, never sent: an odd value in
    // Analytics would split the reports into a group nobody defined.
    AnalyticsLogger.setUserProperties({
      userSegment: typeof userSegment === 'string' ? userSegment : null,
      homeDistrict: typeof homeDistrict === 'string' ? homeDistrict : null,
      isRealtor: typeof isRealtor === 'boolean' ? isRealtor : null,
    })
  } catch (err) {
    if (import.meta.env.DEV) console.info('[analyticsLabels] not applied', err)
  }
}
