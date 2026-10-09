// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'

// Mock the Firebase-dependent stores and guards to avoid initialising Firebase.
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: null, isLoading: false, isInitialized: true }),
}))
vi.mock('@/app/components/ui', () => ({
  Spinner: () => null,
}))
vi.mock('react-router-dom', () => ({
  Navigate: () => null,
}))

import { capabilitiesFor, effectiveCapabilities, type Capabilities } from '../capabilities'
import type { User } from '@/types/user'

// ---------------------------------------------------------------------------
// Minimal user fixture
// ---------------------------------------------------------------------------
function user(overrides: Partial<User> = {}): User {
  return {
    uid: 'test-uid',
    email: 'user@example.com',
    isVerifiedRealtor: false,
    ...overrides,
  } as unknown as User
}

// ---------------------------------------------------------------------------
// capabilitiesFor
// ---------------------------------------------------------------------------
describe('capabilitiesFor', () => {
  it('returns all false for null user', () => {
    const caps = capabilitiesFor(null)
    expect(caps.isAdmin).toBe(false)
    expect(caps.isRealtor).toBe(false)
    expect(caps.isMetricsViewer).toBe(false)
    expect(caps.isTeamMember).toBe(false)
    expect(caps.isMarketingMember).toBe(false)
  })

  it('returns all false for undefined user', () => {
    const caps = capabilitiesFor(undefined)
    expect(caps.isAdmin).toBe(false)
    expect(caps.isRealtor).toBe(false)
    expect(caps.isMetricsViewer).toBe(false)
    expect(caps.isTeamMember).toBe(false)
    expect(caps.isMarketingMember).toBe(false)
  })

  it('returns all false for an unrecognised email', () => {
    const caps = capabilitiesFor(user({ email: 'nobody@example.com' }))
    expect(caps.isAdmin).toBe(false)
    expect(caps.isRealtor).toBe(false)
    expect(caps.isMetricsViewer).toBe(false)
    expect(caps.isTeamMember).toBe(false)
    expect(caps.isMarketingMember).toBe(false)
  })

  it('grants isAdmin to admin@oqupa.com', () => {
    const caps = capabilitiesFor(user({ email: 'admin@oqupa.com' }))
    expect(caps.isAdmin).toBe(true)
  })

  it('grants isRealtor when user.isVerifiedRealtor is true', () => {
    const caps = capabilitiesFor(user({ email: 'nobody@example.com', isVerifiedRealtor: true }))
    expect(caps.isRealtor).toBe(true)
  })

  it('does not grant isRealtor when isVerifiedRealtor is false', () => {
    const caps = capabilitiesFor(user({ email: 'nobody@example.com', isVerifiedRealtor: false }))
    expect(caps.isRealtor).toBe(false)
  })

  it('grants isMetricsViewer to an email on the metrics allowlist', () => {
    const caps = capabilitiesFor(user({ email: 'admin@oqupa.com' }))
    expect(caps.isMetricsViewer).toBe(true)
  })

  it('does not grant isMetricsViewer to an email not on the metrics allowlist', () => {
    const caps = capabilitiesFor(user({ email: 'kennethtquintana@gmail.com' }))
    expect(caps.isMetricsViewer).toBe(false)
  })

  it('grants isTeamMember to a dev roster email', () => {
    const caps = capabilitiesFor(user({ email: 'sarahwalkerdev@gmail.com' }))
    expect(caps.isTeamMember).toBe(true)
  })

  it('does not grant isTeamMember to an email not on the dev roster', () => {
    const caps = capabilitiesFor(user({ email: 'nobody@example.com' }))
    expect(caps.isTeamMember).toBe(false)
  })

  it('grants isMarketingMember to a marketing roster email', () => {
    const caps = capabilitiesFor(user({ email: 'becjanmor@gmail.com' }))
    expect(caps.isMarketingMember).toBe(true)
  })

  it('does not grant isMarketingMember to a dev-only email', () => {
    const caps = capabilitiesFor(user({ email: 'sarahwalkerdev@gmail.com' }))
    expect(caps.isMarketingMember).toBe(false)
  })

  it('admin has all access areas', () => {
    const caps = capabilitiesFor(user({ email: 'admin@oqupa.com', isVerifiedRealtor: false }))
    expect(caps.isAdmin).toBe(true)
    expect(caps.isMetricsViewer).toBe(true)
    expect(caps.isTeamMember).toBe(true)
    expect(caps.isMarketingMember).toBe(true)
  })

  it('matches emails case-insensitively', () => {
    const caps = capabilitiesFor(user({ email: 'Admin@Oqupa.COM' }))
    expect(caps.isAdmin).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// effectiveCapabilities
// ---------------------------------------------------------------------------

const fullCaps: Capabilities = {
  isAdmin: true,
  isRealtor: true,
  isMetricsViewer: true,
  isTeamMember: true,
  isMarketingMember: true,
}

describe('effectiveCapabilities', () => {
  describe('viewAs === "self" — passthrough', () => {
    it('preserves all caps when viewAs is self', () => {
      const eff = effectiveCapabilities(fullCaps, 'self')
      expect(eff.isAdmin).toBe(true)
      expect(eff.isRealtor).toBe(true)
      expect(eff.isMetricsViewer).toBe(true)
      expect(eff.isTeamMember).toBe(true)
      expect(eff.isMarketingMember).toBe(true)
    })

    it('keeps false caps false for a non-admin user viewing as self', () => {
      const nonAdmin: Capabilities = {
        isAdmin: false,
        isRealtor: true,
        isMetricsViewer: false,
        isTeamMember: false,
        isMarketingMember: false,
      }
      const eff = effectiveCapabilities(nonAdmin, 'self')
      expect(eff.isAdmin).toBe(false)
      expect(eff.isRealtor).toBe(true)
    })
  })

  describe('viewAs === "asRealtor" — hide admin chrome, show realtor chrome', () => {
    it('hides isAdmin', () => {
      const eff = effectiveCapabilities(fullCaps, 'asRealtor')
      expect(eff.isAdmin).toBe(false)
    })

    it('isRealtor is true even if the real user is not a realtor', () => {
      const nonRealtor: Capabilities = { ...fullCaps, isRealtor: false }
      const eff = effectiveCapabilities(nonRealtor, 'asRealtor')
      expect(eff.isRealtor).toBe(true)
    })

    it('hides isMetricsViewer (metrics tab is not chrome simulation)', () => {
      const eff = effectiveCapabilities(fullCaps, 'asRealtor')
      expect(eff.isMetricsViewer).toBe(false)
    })

    it('hides isTeamMember', () => {
      const eff = effectiveCapabilities(fullCaps, 'asRealtor')
      expect(eff.isTeamMember).toBe(false)
    })

    it('hides isMarketingMember', () => {
      const eff = effectiveCapabilities(fullCaps, 'asRealtor')
      expect(eff.isMarketingMember).toBe(false)
    })
  })

  describe('viewAs === "asOwner" — hide all admin and realtor chrome', () => {
    it('hides isAdmin', () => {
      const eff = effectiveCapabilities(fullCaps, 'asOwner')
      expect(eff.isAdmin).toBe(false)
    })

    it('hides isRealtor (asOwner overrides even if user is a realtor)', () => {
      const eff = effectiveCapabilities(fullCaps, 'asOwner')
      expect(eff.isRealtor).toBe(false)
    })

    it('hides isMetricsViewer', () => {
      const eff = effectiveCapabilities(fullCaps, 'asOwner')
      expect(eff.isMetricsViewer).toBe(false)
    })

    it('hides isTeamMember', () => {
      const eff = effectiveCapabilities(fullCaps, 'asOwner')
      expect(eff.isTeamMember).toBe(false)
    })

    it('hides isMarketingMember', () => {
      const eff = effectiveCapabilities(fullCaps, 'asOwner')
      expect(eff.isMarketingMember).toBe(false)
    })
  })
})
