/**
 * Roster for the internal team board at /app/equipo.
 *
 * Gated exactly like the /app/numbers metrics tab: an email allowlist, checked
 * client-side for tab visibility and again in firestore.rules for the data.
 * The difference is that this list grants read AND write — the board is
 * collaborative, so any teammate can add, claim, reassign, finish, or delete
 * any task on it.
 *
 * This list is the single source of truth for BOTH access and layout:
 *   - Access:  anyone whose sign-in email appears here can open the board.
 *   - Layout:  each member renders as one column, in the order below.
 *
 * IMPORTANT — mirror this list in `firestore.rules` under `isTeamMember()`.
 * The rules file is the real gate; this file only controls the UI. If they
 * drift, a teammate either sees a board that fails to load (UI allows, rules
 * deny) or is locked out of a collection they could still read (rules allow,
 * UI hides). Rules are NOT auto-deployed — redeploy manually to both staging
 * and production after any change here.
 *
 * Emails are compared lowercased.
 */

/**
 * Which board a task belongs to. Only 'dev' has a roster today; the field
 * exists so a second board (marketing) can be added later by adding roster
 * entries, with no migration of existing task documents.
 */
export type TeamId = 'dev' | 'marketing'

export type TeamMember = {
  /** Display name used as the column header. */
  name: string
  /** Sign-in email. Lowercase. */
  email: string
  /** Which board(s) this person appears on and can access. */
  teams: TeamId[]
}

export const TEAM_MEMBERS: TeamMember[] = [
  { name: 'Jerson', email: 'admin@oqupa.com',                  teams: ['dev'] },
  { name: 'Sarah',  email: 'sarahwalkerdev@gmail.com',         teams: ['dev'] },
  { name: 'Kenny',  email: 'kennethtquintana@gmail.com',       teams: ['dev'] },
  { name: 'Sam',    email: 'samuelsotointernational@gmail.com', teams: ['dev'] },
]

/** The roster entry for a given email, or null if they're not on the team. */
export function memberFor(email: string | undefined | null): TeamMember | null {
  if (!email) return null
  const key = email.toLowerCase()
  return TEAM_MEMBERS.find((m) => m.email === key) ?? null
}

/** True if this email may open and write to the team board. */
export function isTeamMemberEmail(email: string | undefined | null): boolean {
  return memberFor(email) !== null
}

/** Columns to render for a board, in display order. */
export function membersOf(team: TeamId): TeamMember[] {
  return TEAM_MEMBERS.filter((m) => m.teams.includes(team))
}
