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
 * live before the rule that lets it read them: a refused read or no network
 * changes nothing. A missing doc does clear the labels: the person has none.
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
    if (isStillSignedIn && !isStillSignedIn()) return
    // Cleared first, every time: no doc means no label (a new account, or a
    // group the person has left), and a label the doc no longer carries must
    // not linger from earlier in the visit or from someone else.
    AnalyticsLogger.clearUserProperties()
    if (!labels) return
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

/**
 * Removes the labels: on sign-out, so a guest, or the next person on the same
 * browser, is not reported under them. Never throws.
 */
export function clearAnalyticsLabels(): void {
  try {
    AnalyticsLogger.clearUserProperties()
  } catch (err) {
    if (import.meta.env.DEV) console.info('[analyticsLabels] not cleared', err)
  }
}
