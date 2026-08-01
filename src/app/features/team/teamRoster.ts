/**
 * Roster for the internal team board at /app/equipo.
 *
 * This list is the single source of truth for BOTH access and layout:
 *   - Access:  anyone whose sign-in email appears here can open the board and
 *              write to it (add / claim / finish / delete any task).
 *   - Layout:  each member on the active team renders as one column.
 *
 * IMPORTANT — mirror this list in `firestore.rules` under
 * `match /teamTasks/{taskId}`. The rules file is the real gate; this file only
 * controls the UI. If they drift, a teammate either sees a board that fails to
 * load (UI allows, rules deny) or is locked out of a collection they can read
 * (rules allow, UI hides). Rules are NOT auto-deployed — redeploy manually to
 * both staging and production after any change here.
 *
 * Emails are compared lowercased.
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

export const TEAMS: { id: TeamId; label: string }[] = [
  { id: 'dev', label: 'Desarrollo' },
  { id: 'marketing', label: 'Marketing' },
]

export const TEAM_MEMBERS: TeamMember[] = [
  // --- Engineering ---
  { name: 'Jerson',  email: 'admin@oqupa.com',           teams: ['dev', 'marketing'] },
  { name: 'Jerson',  email: 'jersondevs@gmail.com',      teams: ['dev', 'marketing'] },
  { name: 'Sarah',   email: 'sarahsweetpie6@gmail.com',  teams: ['dev'] },
  { name: 'Kenny',   email: 'ktquint@byu.edu',           teams: ['dev'] },
  // TODO(jerson): Samuel's sign-in email is unknown — he has never committed to
  // either repo and isn't on the /app/numbers allowlist. Until it's filled in he
  // cannot open the board and no column renders for him.
  // { name: 'Samuel', email: '', teams: ['dev'] },

  // --- Marketing ---
  // Emails taken from the existing /app/numbers allowlist, so these are known-good
  // Oqupa accounts. Branko and Dani are not on that list yet — add them once their
  // sign-in emails are confirmed.
  { name: 'Becca',   email: 'becjanmor@gmail.com',       teams: ['marketing'] },
  { name: 'Kaden',   email: 'kadenthecanadian@gmail.com', teams: ['marketing'] },
  { name: 'Hernán',  email: 'hrn.mv11@gmail.com',        teams: ['marketing'] },
  { name: 'Libardo', email: 'libardo.pico26@gmail.com',  teams: ['marketing'] },
  { name: 'Lander',  email: 'landerjabar@gmail.com',     teams: ['marketing'] },
]

function normalize(email: string | undefined | null): string | null {
  return email ? email.toLowerCase() : null
}

/** The roster entry for a given email, or null if they're not on any team. */
export function memberFor(email: string | undefined | null): TeamMember | null {
  const key = normalize(email)
  if (!key) return null
  return TEAM_MEMBERS.find((m) => m.email === key) ?? null
}

/** True if this email may open and write to the team board. */
export function isTeamMemberEmail(email: string | undefined | null): boolean {
  return memberFor(email) !== null
}

/** Which boards this email can see. Empty array = no access. */
export function teamsFor(email: string | undefined | null): TeamId[] {
  return memberFor(email)?.teams ?? []
}

/**
 * Columns to render for a board, in display order.
 *
 * Jerson has two roster entries (the Oqupa admin account and his personal
 * Google account) so he can sign in either way. They collapse to a single
 * column keyed on the first entry's email — tasks assigned under the other
 * address would otherwise land in a column nobody is looking at, so
 * `columnEmailFor` maps any address to its canonical column.
 */
export function membersOf(team: TeamId): TeamMember[] {
  const seen = new Set<string>()
  return TEAM_MEMBERS.filter((m) => {
    if (!m.teams.includes(team)) return false
    if (seen.has(m.name)) return false
    seen.add(m.name)
    return true
  })
}

/** Canonical column email for an address (collapses a person's aliases). */
export function columnEmailFor(email: string | undefined | null): string | null {
  const member = memberFor(email)
  if (!member) return null
  const canonical = TEAM_MEMBERS.find((m) => m.name === member.name)
  return canonical?.email ?? member.email
}
