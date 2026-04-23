import { describe, it, expect } from 'vitest'
import {
  nextClaimResetText, countExpiringSoon, countPublishedSince,
  spendThisMonthSoles, buildSubtitle,
} from '../dashboardHelpers'

describe('nextClaimResetText', () => {
  it('rolls from April to mayo', () => {
    expect(nextClaimResetText(new Date(2026, 3, 15))).toBe('Reinicia el 1 de mayo')
  })

  it('wraps from December to enero', () => {
    expect(nextClaimResetText(new Date(2026, 11, 31))).toBe('Reinicia el 1 de enero')
  })

  it('handles first-of-month (still rolls forward)', () => {
    expect(nextClaimResetText(new Date(2026, 0, 1))).toBe('Reinicia el 1 de febrero')
  })
})

describe('countExpiringSoon', () => {
  const now = new Date('2026-04-22T12:00:00Z')

  const mk = (status: string, expiresAt?: Date) => ({ listing: { status, expiresAt } })

  it('counts active listings expiring within 7 days', () => {
    const items = [
      mk('active', new Date('2026-04-25T12:00:00Z')), // 3d — count
      mk('active', new Date('2026-04-28T12:00:00Z')), // 6d — count
      mk('active', new Date('2026-05-02T12:00:00Z')), // 10d — skip
      mk('active'),                                    // no date — skip
    ]
    expect(countExpiringSoon(items, now)).toBe(2)
  })

  it('does NOT count non-active listings even when expiring soon', () => {
    const items = [
      mk('draft',    new Date('2026-04-24T12:00:00Z')),
      mk('expired',  new Date('2026-04-25T12:00:00Z')),
      mk('inactive', new Date('2026-04-26T12:00:00Z')),
    ]
    expect(countExpiringSoon(items, now)).toBe(0)
  })

  it('does not count already-expired listings (negative diff)', () => {
    const items = [
      mk('active', new Date('2026-04-20T12:00:00Z')), // 2d ago
    ]
    expect(countExpiringSoon(items, now)).toBe(0)
  })

  it('counts exactly at the 7-day boundary', () => {
    const items = [
      mk('active', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)), // exactly 7d
      mk('active', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 1000)), // 7d + 1s — skip
    ]
    expect(countExpiringSoon(items, now)).toBe(1)
  })

  it('returns 0 on empty input', () => {
    expect(countExpiringSoon([], now)).toBe(0)
  })
})

describe('countPublishedSince', () => {
  const now = new Date('2026-04-22T12:00:00Z')
  const mk = (publishedAt?: Date) => ({ listing: { publishedAt } })

  it('counts items published within the last N hours', () => {
    const items = [
      mk(new Date('2026-04-22T06:00:00Z')),  // 6h ago — count
      mk(new Date('2026-04-21T13:00:00Z')),  // 23h ago — count
      mk(new Date('2026-04-21T11:00:00Z')),  // 25h ago — skip
      mk(),                                   // no date — skip
    ]
    expect(countPublishedSince(items, 24, now)).toBe(2)
  })

  it('is inclusive at the boundary (>=)', () => {
    const items = [
      mk(new Date(now.getTime() - 24 * 60 * 60 * 1000)),      // exactly 24h — count
      mk(new Date(now.getTime() - 24 * 60 * 60 * 1000 - 1)),   // 24h + 1ms — skip
    ]
    expect(countPublishedSince(items, 24, now)).toBe(1)
  })

  it('returns 0 on empty input', () => {
    expect(countPublishedSince([], 24, now)).toBe(0)
  })
})

describe('spendThisMonthSoles', () => {
  const now = new Date('2026-04-22T12:00:00Z')

  it('sums completed payments in the current calendar month', () => {
    const payments = [
      { amount: 9.90,  status: 'completed', completedAt: new Date('2026-04-05T10:00:00Z') },
      { amount: 19.90, status: 'completed', completedAt: new Date('2026-04-20T10:00:00Z') },
      { amount: 29.90, status: 'completed', completedAt: new Date('2026-03-31T10:00:00Z') }, // prev month — skip
    ]
    expect(spendThisMonthSoles(payments, now)).toBeCloseTo(29.80, 2)
  })

  it('ignores non-completed payments', () => {
    const payments = [
      { amount: 9.90,  status: 'pending',  completedAt: new Date('2026-04-10T10:00:00Z') },
      { amount: 19.90, status: 'refunded', completedAt: new Date('2026-04-10T10:00:00Z') },
      { amount: 29.90, status: 'failed',   completedAt: new Date('2026-04-10T10:00:00Z') },
    ]
    expect(spendThisMonthSoles(payments, now)).toBe(0)
  })

  it('handles undefined payment list', () => {
    expect(spendThisMonthSoles(undefined, now)).toBe(0)
  })

  it('ignores payments missing completedAt', () => {
    const payments = [
      { amount: 9.90, status: 'completed' },
      { amount: 9.90, status: 'completed', completedAt: new Date('2026-04-10T10:00:00Z') },
    ]
    expect(spendThisMonthSoles(payments, now)).toBe(9.90)
  })
})

describe('buildSubtitle', () => {
  describe('admin + realtor (dual role)', () => {
    it('shows both counts when pending work exists', () => {
      expect(buildSubtitle({
        isAdmin: true, isRealtor: true,
        pendingApps: 3, pendingAppsLoading: false,
        availableLeads: 4, leadsLoading: false,
      })).toBe('3 aplicaciones pendientes · 4 oportunidades disponibles.')
    })

    it('singular for 1 of each', () => {
      expect(buildSubtitle({
        isAdmin: true, isRealtor: true,
        pendingApps: 1, pendingAppsLoading: false,
        availableLeads: 1, leadsLoading: false,
      })).toBe('1 aplicación pendiente · 1 oportunidad disponible.')
    })

    it('all clear when both zero', () => {
      expect(buildSubtitle({
        isAdmin: true, isRealtor: true,
        pendingApps: 0, pendingAppsLoading: false,
        availableLeads: 0, leadsLoading: false,
      })).toBe('Todo al día. No hay acciones pendientes.')
    })

    it('loading state', () => {
      expect(buildSubtitle({
        isAdmin: true, isRealtor: true,
        pendingApps: undefined, pendingAppsLoading: true,
        availableLeads: undefined, leadsLoading: false,
      })).toBe('Cargando resumen del día.')
    })

    it('omits a zero side when only one has items', () => {
      expect(buildSubtitle({
        isAdmin: true, isRealtor: true,
        pendingApps: 2, pendingAppsLoading: false,
        availableLeads: 0, leadsLoading: false,
      })).toBe('2 aplicaciones pendientes.')
    })
  })

  describe('admin only', () => {
    it('singular pending', () => {
      expect(buildSubtitle({
        isAdmin: true, isRealtor: false,
        pendingApps: 1, pendingAppsLoading: false,
        availableLeads: undefined, leadsLoading: false,
      })).toBe('1 aplicación pendiente de revisión.')
    })

    it('plural pending', () => {
      expect(buildSubtitle({
        isAdmin: true, isRealtor: false,
        pendingApps: 7, pendingAppsLoading: false,
        availableLeads: undefined, leadsLoading: false,
      })).toBe('7 aplicaciones pendientes de revisión.')
    })

    it('zero pending', () => {
      expect(buildSubtitle({
        isAdmin: true, isRealtor: false,
        pendingApps: 0, pendingAppsLoading: false,
        availableLeads: undefined, leadsLoading: false,
      })).toBe('Todo al día. No hay aplicaciones pendientes.')
    })
  })

  describe('realtor only', () => {
    it('plural leads', () => {
      expect(buildSubtitle({
        isAdmin: false, isRealtor: true,
        pendingApps: undefined, pendingAppsLoading: false,
        availableLeads: 4, leadsLoading: false,
      })).toBe('4 oportunidades disponibles para agentes.')
    })

    it('zero leads', () => {
      expect(buildSubtitle({
        isAdmin: false, isRealtor: true,
        pendingApps: undefined, pendingAppsLoading: false,
        availableLeads: 0, leadsLoading: false,
      })).toBe('Sin oportunidades nuevas por ahora. Revisa el resumen de tus anuncios abajo.')
    })
  })

  describe('pure owner', () => {
    it('generic fallback', () => {
      expect(buildSubtitle({
        isAdmin: false, isRealtor: false,
        pendingApps: undefined, pendingAppsLoading: false,
        availableLeads: undefined, leadsLoading: false,
      })).toBe('Aquí está el resumen de tus anuncios.')
    })
  })
})
