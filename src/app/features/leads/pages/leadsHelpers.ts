/**
 * Pure helpers for Oportunidades (/app/leads). Extracted so unit tests
 * don't pull in the Firebase/React module graph.
 *
 * IA (2026-04-22): Oportunidades is the funnel — discovery through commit.
 * Three flat tabs:
 *   - Disponibles  — listings open for claim
 *   - En Espera    — claims the agent made; owner hasn't decided yet.
 *                    Lost claims (owner picked someone else) hide immediately.
 *   - Invitaciones — owner picked me, I must accept or decline. Time-sensitive.
 *
 * Once the agent accepts an invitation, the listing moves out of this page
 * and into Mis Propiedades → Asignadas.
 */
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import type { RealtorClaim } from '@/types/realtorClaim'

export type LeadsTab = 'disponibles' | 'en-espera' | 'invitaciones'

const VALID_TABS: readonly LeadsTab[] = ['disponibles', 'en-espera', 'invitaciones'] as const

export function isValidLeadsTab(t: string | null): t is LeadsTab {
  return t !== null && (VALID_TABS as readonly string[]).includes(t)
}

/**
 * Claims the agent is still in the running for. Filters out:
 *   - Lost claims (listing.assignedRealtorId points to another realtor).
 *     Auto-hide is paired with a notification elsewhere.
 *   - Won claims (listing.assignedRealtorId === me). Those surface as
 *     invitations via useAgentAssignments instead.
 *   - Declined invitations (the agent's id is in listing.declinedRealtorIds).
 *     After decline, the server nulls assignedRealtorId — without this check
 *     the claim would re-appear in En Espera, creating a "ghost" state.
 *
 * Sort: most recently claimed first.
 */
export function filterEnEspera(
  claims: { claim: RealtorClaim; listing: Listing; property: Property }[],
  realtorId: string,
): { claim: RealtorClaim; listing: Listing; property: Property }[] {
  return claims
    .filter(({ listing }) => !listing.assignedRealtorId)
    .filter(({ listing }) => !(listing.declinedRealtorIds ?? []).includes(realtorId))
    .sort((a, b) => b.claim.claimedAt.getTime() - a.claim.claimedAt.getTime())
}

/**
 * Assignments where the owner picked me and I haven't accepted yet.
 * This is the single most time-sensitive state for an agent — the tab
 * should badge the count.
 */
export function filterInvitaciones(
  entries: { listing: Listing; property: Property }[],
): { listing: Listing; property: Property }[] {
  return entries.filter(({ listing }) => listing.assignmentStatus === 'pending_acceptance')
}
