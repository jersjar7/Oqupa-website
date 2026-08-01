/**
 * Board rosters, derived from the ONE access list.
 *
 * Do not add people here — edit `src/app/features/access/people.ts`. This file
 * only reshapes that list into what the boards need (columns, per-board gates).
 */
import {
  canAccess,
  peopleWith,
  personFor,
  type Person,
} from '@/app/features/access/people'

/** Which board a task belongs to. */
export type TeamId = 'dev' | 'marketing'

/** A board member. Same shape the columns already expect. */
export type TeamMember = Person

/** The roster entry for a given email, or null. */
export function memberFor(email: string | undefined | null): TeamMember | null {
  return personFor(email)
}

/** True if this email may open and write to a specific board. */
export function canAccessTeam(
  email: string | undefined | null,
  team: TeamId,
): boolean {
  return canAccess(email, team)
}

/** True if this email may open the DEV board (/app/equipo). */
export function isTeamMemberEmail(email: string | undefined | null): boolean {
  return canAccess(email, 'dev')
}

/** True if this email may open the marketing calendar (/app/contenido). */
export function isMarketingMemberEmail(email: string | undefined | null): boolean {
  return canAccess(email, 'marketing')
}

/** Columns to render for a board, in display order. */
export function membersOf(team: TeamId): TeamMember[] {
  return peopleWith(team)
}

/** Everyone on any board. Kept for tests that walk the roster. */
export const TEAM_MEMBERS: TeamMember[] = [
  ...new Set([...peopleWith('dev'), ...peopleWith('marketing')]),
]
