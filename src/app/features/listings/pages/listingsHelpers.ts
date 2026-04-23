/**
 * Pure helpers for Mis Propiedades. Extracted so they can be unit-tested
 * without dragging in the Firebase/React imports that come with ListingsPage.
 *
 * IA (as of 2026-04-22): Mis Propiedades holds only what the agent is
 * actually responsible for — Propias (owned listings) and Asignadas
 * (listings where the owner picked them AND they accepted). The claim
 * pipeline lives on Oportunidades (`/app/leads`) instead.
 */
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'

export type Tab = 'propias' | 'asignadas'

const VALID_TABS: readonly Tab[] = ['propias', 'asignadas'] as const

export function isValidTab(t: string | null): t is Tab {
  return t !== null && (VALID_TABS as readonly string[]).includes(t)
}

/**
 * Filter to listings the agent has ACCEPTED as their assignment. Pending
 * invitations (owner picked me, I haven't responded yet) live on
 * Oportunidades → Invitaciones so we exclude them here.
 */
export function filterAsignadasAccepted(
  entries: { listing: Listing; property: Property }[],
): { listing: Listing; property: Property }[] {
  return entries
    .filter(({ listing }) => listing.assignmentStatus === 'accepted')
    .sort((a, b) => (b.listing.updatedAt?.getTime() ?? 0) - (a.listing.updatedAt?.getTime() ?? 0))
}
