/**
 * THE access list for Oqupa's internal pages. One file. Edit only this.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  TO ADD OR REMOVE SOMEONE
 *
 *    1. Edit the PEOPLE array below — nothing else. Everyone listed is a team
 *       account (excluded from analytics, ADR-050), even with `access: []`.
 *       Also update TEAM_EMAILS in oqupa/functions/lib/team-roster.js and
 *       oqupa/lib/utils/team_emails.dart — CI fails until all three agree.
 *    2. Run:  npm run access:sync      (writes the list into firestore.rules)
 *    3. Commit both files together.
 *    4. Deploy the rules:
 *         cd .. && firebase deploy --only firestore:rules --project oqupa-staging
 *         cd .. && firebase deploy --only firestore:rules --project oqupa-production
 *
 *  Skipping step 2 or 4 is caught before it can ship: a test fails if
 *  firestore.rules disagrees with this file, and CI runs it on every push.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * WHY THIS FILE EXISTS. Access used to be written twice — once here for what
 * the screen shows, once in firestore.rules for what the data allows — across
 * four separate lists in five places. Updating one and not the other gives a
 * teammate either a tab that errors or silent access to data they should not
 * have, and neither failure announces itself. Now there is one list, the rules
 * are generated from it, and drift fails the build.
 *
 * Firestore rules cannot import TypeScript — they are evaluated by Google, not
 * by this app — so the rules file will always be a SECOND copy. What changed is
 * that the copy is generated and verified, never hand-edited.
 */

/** An internal area a person can be granted. */
export type AccessArea =
  /** Admin panel — realtor applications, /app/aplicaciones. */
  | 'admin'
  /** Internal metrics dashboard, /app/numbers. */
  | 'metrics'
  /** Software engineering board, /app/equipo. Also renders one column per person. */
  | 'dev'
  /** Marketing content calendar, /app/contenido. */
  | 'marketing'

export interface Person {
  /** Display name. Used as the column header on the dev board. */
  name: string
  /** Sign-in email, lowercase. Compared case-insensitively. */
  email: string
  /** Exactly which areas this person may reach. Grant the minimum. */
  access: AccessArea[]
}

/**
 * Ordering matters for `dev`: it is the left-to-right column order on the
 * software board. Elsewhere it is irrelevant.
 */
export const PEOPLE: Person[] = [
  // Founders / admin
  { name: 'Jerson',  email: 'admin@oqupa.com',                   access: ['admin', 'metrics', 'dev', 'marketing'] },
  // Jerson's personal Google account. On the team, so it never counts in
  // analytics (ADR-050) — but it opens no internal page; admin@ does that.
  { name: 'Jerson (personal)', email: 'jersondevs@gmail.com',     access: [] },
  { name: 'App Store review', email: 'jersondevs+appstore@gmail.com', access: [] },
  { name: 'Branko',  email: 'bbarba@oqupa.com',                  access: ['admin', 'metrics'] },

  // Software engineering — the dev board renders one column per person, in
  // this order.
  { name: 'Sarah',   email: 'sarahwalkerdev@gmail.com',          access: ['dev', 'metrics'] },
  { name: 'Kenny',   email: 'kennethtquintana@gmail.com',        access: ['dev'] },
  { name: 'Sam',     email: 'samuelsotointernational@gmail.com', access: ['dev', 'metrics'] },

  // Marketing
  { name: 'Becca',   email: 'becjanmor@gmail.com',               access: ['metrics', 'marketing'] },
  { name: 'Hernán',  email: 'hrn.mv11@gmail.com',                access: ['marketing'] },
  { name: 'Daniel',  email: 'godoy.degs@gmail.com',              access: ['marketing'] },

  // Contenido (removed from Números on 2026-09-28 at Jerson's instruction)
  { name: 'Kaden',   email: 'kadenthecanadian@gmail.com',        access: ['marketing'] },
  { name: 'Libardo', email: 'libardo.pico26@gmail.com',          access: ['marketing'] },

  // Removed from Números on 2026-08-01 at Jerson's instruction. Listed here as
  // a record of the decision, with no access granted. Safe to delete.
  //   ed.rafaelbarbosa@gmail.com  (Rafael)
  //   landerjabar@gmail.com       (Lander)
  //
  // Hernán was on this list too. On 2026-08-03 he was granted Contenido — and
  // ONLY Contenido. He is deliberately still off Números; the 2026-08-01
  // decision stands and adding him back there needs its own instruction.
]

/**
 * Every team account, lowercase and sorted — whether or not it opens any page.
 *
 * Team accounts NEVER count in analytics (ADR-050, Jerson 2026-11-02: "Please
 * do not include in our analytics anything done with my admin account so we do
 * not fake numbers. Make this a rule for any of our Equipo board emails.").
 * The website stops sending GA4 / Meta / TikTok events while one is signed in,
 * and the nightly Números build leaves their accounts, listings, contacts and
 * payments out.
 *
 * Copies that cannot import this file, kept equal by checks that fail the build:
 *   - oqupa/functions/lib/team-roster.js  TEAM_EMAILS  (Oqupa-Platform CI:
 *     scripts/check-team-emails.mjs)
 *   - oqupa/lib/utils/team_emails.dart    (app test pins it to the functions copy)
 */
export const TEAM_EMAILS: readonly string[] = PEOPLE.map((p) => p.email.toLowerCase()).sort()

/** True when the email belongs to a team account. Case-insensitive. */
export function isTeamEmail(email: string | undefined | null): boolean {
  if (!email) return false
  return TEAM_EMAILS.includes(email.trim().toLowerCase())
}

/** Everyone granted an area, in file order. */
export function peopleWith(area: AccessArea): Person[] {
  return PEOPLE.filter((p) => p.access.includes(area))
}

/** Emails granted an area, lowercase and sorted — the shape the rules use. */
export function emailsWith(area: AccessArea): string[] {
  return peopleWith(area)
    .map((p) => p.email.toLowerCase())
    .sort()
}

/** The single access check. Everything else should call this. */
export function canAccess(
  email: string | undefined | null,
  area: AccessArea,
): boolean {
  if (!email) return false
  const key = email.toLowerCase()
  return PEOPLE.some((p) => p.email.toLowerCase() === key && p.access.includes(area))
}

/** The roster entry for an email, or null. */
export function personFor(email: string | undefined | null): Person | null {
  if (!email) return null
  const key = email.toLowerCase()
  return PEOPLE.find((p) => p.email.toLowerCase() === key) ?? null
}
