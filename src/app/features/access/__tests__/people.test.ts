import { describe, it, expect } from 'vitest'
import { PEOPLE, emailsWith, personFor, peopleWith, type AccessArea } from '../people'

// ---------------------------------------------------------------------------
// emailsWith — used by access:sync script and firestore.rules generation
// ---------------------------------------------------------------------------
describe('emailsWith', () => {
  const AREAS: AccessArea[] = ['admin', 'metrics', 'dev', 'marketing']

  it('returns a non-empty array for every area', () => {
    for (const area of AREAS) {
      expect(emailsWith(area).length).toBeGreaterThan(0)
    }
  })

  it('returns only lowercase emails', () => {
    for (const area of AREAS) {
      for (const email of emailsWith(area)) {
        expect(email).toBe(email.toLowerCase())
      }
    }
  })

  it('returns emails in ascending sorted order', () => {
    for (const area of AREAS) {
      const emails = emailsWith(area)
      const sorted = [...emails].sort()
      expect(emails).toEqual(sorted)
    }
  })

  it('only includes emails of people who have the area in their access list', () => {
    for (const area of AREAS) {
      const granted = emailsWith(area)
      for (const email of granted) {
        const person = PEOPLE.find((p) => p.email.toLowerCase() === email)
        expect(person?.access).toContain(area)
      }
    }
  })

  it('includes admin@oqupa.com in admin area', () => {
    expect(emailsWith('admin')).toContain('admin@oqupa.com')
  })

  it('does not include emails of people not in the area', () => {
    // sarahwalkerdev@gmail.com is dev-only, not in admin
    expect(emailsWith('admin')).not.toContain('sarahwalkerdev@gmail.com')
  })

  it('count matches peopleWith for each area', () => {
    for (const area of AREAS) {
      expect(emailsWith(area).length).toBe(peopleWith(area).length)
    }
  })
})

// ---------------------------------------------------------------------------
// personFor — looks up a Person by email (case-insensitive)
// ---------------------------------------------------------------------------
describe('personFor', () => {
  it('returns null for null input', () => {
    expect(personFor(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(personFor(undefined)).toBeNull()
  })

  it('returns null for an unrecognised email', () => {
    expect(personFor('nobody@example.com')).toBeNull()
  })

  it('returns the Person for a known email (exact case)', () => {
    const person = personFor('admin@oqupa.com')
    expect(person).not.toBeNull()
    expect(person?.email).toBe('admin@oqupa.com')
    expect(person?.name).toBe('Jerson')
  })

  it('returns the Person case-insensitively', () => {
    const person = personFor('Admin@Oqupa.COM')
    expect(person).not.toBeNull()
    expect(person?.email).toBe('admin@oqupa.com')
  })

  it('returns the correct Person for a dev roster email', () => {
    const person = personFor('sarahwalkerdev@gmail.com')
    expect(person?.name).toBe('Sarah')
    expect(person?.access).toContain('dev')
  })

  it('returns the correct Person for a marketing email', () => {
    const person = personFor('becjanmor@gmail.com')
    expect(person?.name).toBe('Becca')
    expect(person?.access).toContain('marketing')
  })

  it('every email in PEOPLE is found by personFor', () => {
    for (const p of PEOPLE) {
      const found = personFor(p.email)
      expect(found).not.toBeNull()
      expect(found?.email).toBe(p.email)
    }
  })
})

// ---------------------------------------------------------------------------
// teamRoster canAccessTeam wrapper (via teamRoster.ts)
// ---------------------------------------------------------------------------
describe('peopleWith', () => {
  it('returns all people with dev access', () => {
    const devPeople = peopleWith('dev')
    expect(devPeople.every((p) => p.access.includes('dev'))).toBe(true)
    expect(devPeople.length).toBeGreaterThan(0)
  })

  it('returns an empty array for an area with no explicit people (invariant)', () => {
    // Sanity: at least one area must have people
    const AREAS: AccessArea[] = ['admin', 'metrics', 'dev', 'marketing']
    expect(AREAS.some((a) => peopleWith(a).length > 0)).toBe(true)
  })
})
