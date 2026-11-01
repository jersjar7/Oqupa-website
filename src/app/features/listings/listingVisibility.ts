import type { ListingStatus } from '@/types/enums'

/**
 * How a listing's public page (/property/:id) treats a status.
 *
 * - `open`       — active: the whole page, with the contact button.
 * - `closed`     — sold / rented: the page stays (shared links keep working),
 *                  marked Vendido / Alquilado, with NO way to contact.
 * - `owner-only` — any other status, seen by its owner: the page, with a note
 *                  saying only they can see it.
 * - `hidden`     — any other status, seen by anyone else: "not found".
 *
 * Unknown statuses fail closed. The listing document is world-readable, so
 * this is presentation, not access control — the server refuses the contact
 * for anything that is not active.
 */
export type ListingPageView = 'open' | 'closed' | 'owner-only' | 'hidden'

export function listingPageView(status: ListingStatus, isOwner: boolean): ListingPageView {
  if (status === 'active') return 'open'
  if (status === 'sold' || status === 'rented') return 'closed'
  return isOwner ? 'owner-only' : 'hidden'
}

/** The banner on a closed listing — the founder's exact words. */
export function closedLabel(status: ListingStatus): 'Vendido' | 'Alquilado' | null {
  if (status === 'sold') return 'Vendido'
  if (status === 'rented') return 'Alquilado'
  return null
}

const OWNER_ONLY_STATE: Partial<Record<ListingStatus, string>> = {
  deactivated: 'está desactivada',
  draft: 'es un borrador',
  paymentPending: 'tiene un pago pendiente',
}

/** The note an owner sees on their own listing that strangers cannot see. */
export function ownerOnlyNote(status: ListingStatus): string {
  const state = OWNER_ONLY_STATE[status] ?? 'no está visible'
  return `Esta publicación ${state}. Solo tú puedes verla.`
}
