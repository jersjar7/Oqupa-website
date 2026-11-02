// "Reportar anuncio" (ADR-046 #5) — the app's report_block_actions, same
// reasons and the same document. Write-only: triage happens in the console.
// Firebase is loaded when a report is sent, not with the listing page.
import type { ReportReason } from '@/lib/reportReasons'

export { REPORT_REASONS, type ReportReason } from '@/lib/reportReasons'

export const reportService = {
  async reportListing(input: { listingId: string; ownerUserId: string; reason: ReportReason }): Promise<void> {
    const [{ addDoc, collection, serverTimestamp }, { auth, db }] = await Promise.all([
      import('firebase/firestore'),
      import('@/lib/firebase'),
    ])
    await addDoc(collection(db, 'reports'), {
      listingId: input.listingId,
      ownerUserId: input.ownerUserId,
      // The rules require the caller's own uid, or null for a guest.
      reporterId: auth.currentUser?.uid ?? null,
      reason: input.reason,
      createdAt: serverTimestamp(),
    })
  },
}
