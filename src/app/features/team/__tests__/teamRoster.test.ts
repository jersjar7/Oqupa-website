import { describe, it, expect } from 'vitest'
import {
  isTeamMemberEmail,
  isMarketingMemberEmail,
  canAccessTeam,
  memberFor,
  membersOf,
  TEAM_MEMBERS,
} from '../teamRoster'

// ---------------------------------------------------------------------------
// isTeamMemberEmail
// ---------------------------------------------------------------------------
describe('isTeamMemberEmail', () => {
  it('returns true for a dev roster member', () => {
    expect(isTeamMemberEmail('sarahwalkerdev@gmail.com')).toBe(true)
  })

  it('returns false for a marketing-only member', () => {
    expect(isTeamMemberEmail('hrn.mv11@gmail.com')).toBe(false)
  })

  it('returns false for an unknown email', () => {
    expect(isTeamMemberEmail('stranger@example.com')).toBe(false)
  })

  it('returns false for null and undefined', () => {
    expect(isTeamMemberEmail(null)).toBe(false)
    expect(isTeamMemberEmail(undefined)).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isTeamMemberEmail('SarahWalkerDev@Gmail.com')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// isMarketingMemberEmail
// ---------------------------------------------------------------------------
describe('isMarketingMemberEmail', () => {
  it('returns true for a marketing member', () => {
    expect(isMarketingMemberEmail('becjanmor@gmail.com')).toBe(true)
  })

  it('returns false for a dev-only member', () => {
    expect(isMarketingMemberEmail('sarahwalkerdev@gmail.com')).toBe(false)
  })

  it('returns false for null and undefined', () => {
    expect(isMarketingMemberEmail(null)).toBe(false)
    expect(isMarketingMemberEmail(undefined)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// canAccessTeam — wraps canAccess for a specific TeamId
// ---------------------------------------------------------------------------
describe('canAccessTeam', () => {
  it('returns true for a dev member accessing the dev team', () => {
    expect(canAccessTeam('admin@oqupa.com', 'dev')).toBe(true)
  })

  it('returns false for a dev member accessing the marketing team', () => {
    expect(canAccessTeam('sarahwalkerdev@gmail.com', 'marketing')).toBe(false)
  })

  it('returns true for a marketing member accessing the marketing team', () => {
    expect(canAccessTeam('becjanmor@gmail.com', 'marketing')).toBe(true)
  })

  it('returns false for an unknown email on any team', () => {
    expect(canAccessTeam('nobody@example.com', 'dev')).toBe(false)
    expect(canAccessTeam('nobody@example.com', 'marketing')).toBe(false)
  })

  it('returns false for null/undefined email', () => {
    expect(canAccessTeam(null, 'dev')).toBe(false)
    expect(canAccessTeam(undefined, 'marketing')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// memberFor
// ---------------------------------------------------------------------------
describe('memberFor', () => {
  it('returns the Person object for a known email', () => {
    const member = memberFor('admin@oqupa.com')
    expect(member).not.toBeNull()
    expect(member?.name).toBe('Jerson')
  })

  it('returns null for an unknown email', () => {
    expect(memberFor('nobody@example.com')).toBeNull()
  })

  it('returns null for null/undefined', () => {
    expect(memberFor(null)).toBeNull()
    expect(memberFor(undefined)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// membersOf
// ---------------------------------------------------------------------------
describe('membersOf', () => {
  it('returns dev board members', () => {
    const members = membersOf('dev')
    expect(members.length).toBeGreaterThan(0)
    expect(members.every((m) => m.access.includes('dev'))).toBe(true)
  })

  it('returns marketing board members', () => {
    const members = membersOf('marketing')
    expect(members.length).toBeGreaterThan(0)
    expect(members.every((m) => m.access.includes('marketing'))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TEAM_MEMBERS — union of all board members
// ---------------------------------------------------------------------------
describe('TEAM_MEMBERS', () => {
  it('contains at least one person', () => {
    expect(TEAM_MEMBERS.length).toBeGreaterThan(0)
  })

  it('does not contain duplicate emails', () => {
    const emails = TEAM_MEMBERS.map((m) => m.email.toLowerCase())
    expect(new Set(emails).size).toBe(emails.length)
  })

  it('only includes people who have at least dev or marketing access', () => {
    for (const member of TEAM_MEMBERS) {
      expect(
        member.access.includes('dev') || member.access.includes('marketing'),
      ).toBe(true)
    }
  })
})
