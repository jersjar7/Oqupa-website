import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PEOPLE, emailsWith, canAccess, type AccessArea } from '../people'

/**
 * firestore.rules holds a SECOND copy of the access lists — unavoidable, since
 * Google evaluates the rules and they cannot import TypeScript. This test is
 * what makes that copy safe: it fails the build if the two ever disagree.
 *
 * If it fails, do NOT edit firestore.rules. Edit people.ts and run:
 *     npm run access:sync
 */
/**
 * firestore.rules lives in the PARENT repository (Oqupa-Platform), not this
 * one. A checkout of the website alone genuinely does not have it, so the
 * cross-file comparison is skipped there rather than failing.
 *
 * That skip is safe because the authoritative check runs in the parent repo's
 * CI (.github/workflows/access-sync.yml), which checks out BOTH repos and is
 * the gate that guards the rules deploy. The tests below the comparison — the
 * ones about the areas being separate — need no file and always run.
 */
const RULES_PATH = resolve(__dirname, '../../../../../..', 'firestore.rules')
const RULES = existsSync(RULES_PATH) ? readFileSync(RULES_PATH, 'utf8') : null

const AREAS: AccessArea[] = ['admin', 'metrics', 'dev', 'marketing']

function emailsInRules(marker: string): string[] {
  const re = new RegExp(
    `>>> GENERATED ACCESS:${marker}[\\s\\S]*?<<< GENERATED ACCESS:${marker}`,
  )
  const block = RULES!.match(re)
  if (!block) throw new Error(`No generated block for "${marker}" in firestore.rules`)
  return [...block[0].matchAll(/'([a-z0-9._%+-]+@[a-z0-9.-]+)'/g)]
    .map((m) => m[1]!)
    .sort()
}

describe.skipIf(RULES === null)('access lists stay in sync with firestore.rules', () => {
  for (const area of AREAS) {
    it(`${area}: the rules match people.ts exactly`, () => {
      expect(emailsInRules(area)).toEqual(emailsWith(area))
    })
  }

  it('every area is generated — no hand-written list left behind', () => {
    for (const area of AREAS) {
      expect(RULES!).toContain(`>>> GENERATED ACCESS:${area}`)
      expect(RULES!).toContain(`<<< GENERATED ACCESS:${area}`)
    }
  })
})

describe('the four areas are genuinely separate', () => {
  // The failure that matters is not "can the right person get in" — it is
  // "can the WRONG person get in". Each area is checked against everyone.
  for (const area of AREAS) {
    it(`${area}: admits exactly its own people and refuses everyone else`, () => {
      for (const person of PEOPLE) {
        expect(canAccess(person.email, area)).toBe(person.access.includes(area))
      }
      expect(canAccess('stranger@example.com', area)).toBe(false)
      expect(canAccess(undefined, area)).toBe(false)
      expect(canAccess(null, area)).toBe(false)
    })

    it(`${area}: at least one person is deliberately excluded`, () => {
      // Without this the assertion above would still pass if everyone had every
      // area, and the separation would be untested.
      expect(PEOPLE.some((p) => !p.access.includes(area))).toBe(true)
    })
  }

  it('matches emails case-insensitively', () => {
    expect(canAccess('ADMIN@Oqupa.COM', 'admin')).toBe(true)
    expect(canAccess('BecJanMor@Gmail.com', 'marketing')).toBe(true)
  })

  it('a developer cannot reach marketing, and marketing cannot reach dev', () => {
    expect(canAccess('sarahwalkerdev@gmail.com', 'marketing')).toBe(false)
    expect(canAccess('becjanmor@gmail.com', 'dev')).toBe(false)
  })

  it('people removed from Números have no access anywhere', () => {
    for (const area of AREAS) {
      expect(canAccess('ed.rafaelbarbosa@gmail.com', area)).toBe(false)
      expect(canAccess('landerjabar@gmail.com', area)).toBe(false)
    }
  })

  it('Hernán was granted Contenido without being let back into Números', () => {
    // He was removed from Números on 2026-08-01 and granted Contenido on
    // 2026-08-03. Two separate decisions — only the second was reversed, and
    // the easiest way to undo the first by accident is a careless edit here.
    expect(canAccess('hrn.mv11@gmail.com', 'marketing')).toBe(true)
    expect(canAccess('hrn.mv11@gmail.com', 'metrics')).toBe(false)
    expect(canAccess('hrn.mv11@gmail.com', 'dev')).toBe(false)
    expect(canAccess('hrn.mv11@gmail.com', 'admin')).toBe(false)
  })

  it('the four people added to Contenido on 2026-08-03 can reach it', () => {
    for (const email of [
      'hrn.mv11@gmail.com',        // Hernán
      'godoy.degs@gmail.com',      // Daniel
      'kadenthecanadian@gmail.com', // Kaden
      'libardo.pico26@gmail.com',   // Libardo
    ]) {
      expect(canAccess(email, 'marketing')).toBe(true)
    }
  })

  it('Daniel is new and reaches Contenido only', () => {
    expect(canAccess('godoy.degs@gmail.com', 'marketing')).toBe(true)
    expect(canAccess('godoy.degs@gmail.com', 'metrics')).toBe(false)
    expect(canAccess('godoy.degs@gmail.com', 'dev')).toBe(false)
    expect(canAccess('godoy.degs@gmail.com', 'admin')).toBe(false)
  })

  it('Kaden and Libardo keep Números and gain Contenido, nothing more', () => {
    for (const email of ['kadenthecanadian@gmail.com', 'libardo.pico26@gmail.com']) {
      expect(canAccess(email, 'metrics')).toBe(true)
      expect(canAccess(email, 'marketing')).toBe(true)
      expect(canAccess(email, 'dev')).toBe(false)
      expect(canAccess(email, 'admin')).toBe(false)
    }
  })
})
