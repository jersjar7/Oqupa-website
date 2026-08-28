import { getFunctions, httpsCallable, FunctionsError } from 'firebase/functions'

/**
 * The seller's contact details, obtained from the server.
 *
 * WHY THIS EXISTS (ADR-015 Phase 3.4). The number used to be read straight off
 * the listing document, which is world-readable — so all 50 sellers' WhatsApp
 * numbers could be downloaded in one anonymous request, and the contact counter
 * could be bypassed by anyone skipping the app. The button's "must be signed in
 * and phone-verified" rule was decoration, because the DATA was public.
 *
 * The server now decides, resolves the number live from the user record, and
 * records the disclosure. The client no longer holds the number until it asks.
 */
export interface ListingContact {
  phone: string
  displayName: string | null
  contactRole: 'owner' | 'agent'
  counted: boolean
}

export type ContactDenialReason =
  | 'needs-login'
  | 'needs-phone-verification'
  /** Our record claims a verified phone; Firebase Auth has none attached.
   *  Distinct because the person is looking at a profile that says they are
   *  verified, so "verify your phone" alone reads as a contradiction. */
  | 'needs-phone-reverification'
  | 'needs-email-verification'
  | 'rate-limited'
  | 'unavailable'

export class ContactDenied extends Error {
  constructor(public readonly reason: ContactDenialReason) {
    super(reason)
    this.name = 'ContactDenied'
  }
}

export const contactService = {
  /**
   * Asks the server for the listing's contact details.
   *
   * Throws {@link ContactDenied} with a reason the UI can act on, rather than a
   * raw error — the caller needs to know whether to open the sign-in modal, the
   * verify-phone modal, or simply say it is unavailable.
   */
  async getListingContact(listingId: string): Promise<ListingContact> {
    const functions = getFunctions(undefined, 'southamerica-east1')
    const callable = httpsCallable<{ listingId: string }, ListingContact>(
      functions,
      'getListingContact',
    )

    try {
      const result = await callable({ listingId })
      return result.data
    } catch (error) {
      const code = (error as FunctionsError)?.code ?? ''
      if (code.includes('unauthenticated')) throw new ContactDenied('needs-login')
      if (code.includes('failed-precondition')) throw new ContactDenied('needs-phone-verification')
      // The server refuses with its own code when the email link is still
      // unclicked (phone-first pipeline, 2026-08-26).
      if (code.includes('permission-denied')) throw new ContactDenied('needs-email-verification')
      // The server reserves this one for "no phone is actually attached to
      // this account". Seen on staging 2026-08-27 as a bare 409, because the
      // website had never been taught the code and fell through to the
      // generic message — on a page whose profile said "Teléfono verificado".
      if (code.includes('aborted')) throw new ContactDenied('needs-phone-reverification')
      if (code.includes('resource-exhausted')) throw new ContactDenied('rate-limited')
      throw new ContactDenied('unavailable')
    }
  },
}
