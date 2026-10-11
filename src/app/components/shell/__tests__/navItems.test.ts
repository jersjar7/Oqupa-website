import { describe, it, expect } from 'vitest'
import { getNavGroups, getMobileNavItems, type NavItem } from '../navItems'
import type { Capabilities } from '../capabilities'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const noCaps: Capabilities = {
  isAdmin: false,
  isRealtor: false,
  isMetricsViewer: false,
  isTeamMember: false,
  isMarketingMember: false,
}

const realtorOnly: Capabilities = { ...noCaps, isRealtor: true }
const adminOnly: Capabilities = { ...noCaps, isAdmin: true }
const adminAndRealtor: Capabilities = { ...noCaps, isAdmin: true, isRealtor: true }
const metricsViewer: Capabilities = { ...noCaps, isMetricsViewer: true }
const teamMember: Capabilities = { ...noCaps, isTeamMember: true }
const marketingMember: Capabilities = { ...noCaps, isMarketingMember: true }

function flatItems(caps: Capabilities): NavItem[] {
  return getNavGroups(caps).flatMap((g) => g.items)
}

function itemIds(items: NavItem[]): string[] {
  return items.map((i) => i.id)
}

// ---------------------------------------------------------------------------
// getNavGroups — structure & inclusion
// ---------------------------------------------------------------------------
describe('getNavGroups', () => {
  describe('plain owner (no special caps)', () => {
    it('returns a single group with no label', () => {
      const groups = getNavGroups(noCaps)
      expect(groups).toHaveLength(1)
      expect(groups[0]!.label).toBeUndefined()
    })

    it('includes dashboard, misAnuncios, misListas, pagos, miPerfil', () => {
      const ids = itemIds(flatItems(noCaps))
      expect(ids).toContain('dashboard')
      expect(ids).toContain('misAnuncios')
      expect(ids).toContain('misListas')
      expect(ids).toContain('pagos')
      expect(ids).toContain('miPerfil')
    })

    it('does not include admin-only items', () => {
      const ids = itemIds(flatItems(noCaps))
      expect(ids).not.toContain('aplicaciones')
      expect(ids).not.toContain('oportunidades')
    })

    it('does not include internal staff tabs', () => {
      const ids = itemIds(flatItems(noCaps))
      expect(ids).not.toContain('numeros')
      expect(ids).not.toContain('equipo')
      expect(ids).not.toContain('contenido')
    })
  })

  describe('realtor only', () => {
    it('returns a single flat group', () => {
      const groups = getNavGroups(realtorOnly)
      expect(groups).toHaveLength(1)
    })

    it('includes oportunidades and miRegistroAgente', () => {
      const ids = itemIds(flatItems(realtorOnly))
      expect(ids).toContain('oportunidades')
      expect(ids).toContain('miRegistroAgente')
    })

    it('does not include aplicaciones', () => {
      const ids = itemIds(flatItems(realtorOnly))
      expect(ids).not.toContain('aplicaciones')
    })
  })

  describe('admin only', () => {
    it('returns a single flat group', () => {
      const groups = getNavGroups(adminOnly)
      expect(groups).toHaveLength(1)
    })

    it('includes aplicaciones', () => {
      const ids = itemIds(flatItems(adminOnly))
      expect(ids).toContain('aplicaciones')
    })

    it('does not include oportunidades or miRegistroAgente', () => {
      const ids = itemIds(flatItems(adminOnly))
      expect(ids).not.toContain('oportunidades')
      expect(ids).not.toContain('miRegistroAgente')
    })
  })

  describe('admin + realtor (dual role)', () => {
    it('returns three groups with labels', () => {
      const groups = getNavGroups(adminAndRealtor)
      expect(groups).toHaveLength(3)
      const labels = groups.map((g) => g.label)
      expect(labels).toContain('Principal')
      expect(labels).toContain('Agente')
      expect(labels).toContain('Admin')
    })

    it('puts aplicaciones in the Admin group', () => {
      const groups = getNavGroups(adminAndRealtor)
      const adminGroup = groups.find((g) => g.label === 'Admin')!
      expect(itemIds(adminGroup.items)).toContain('aplicaciones')
    })

    it('puts oportunidades in the Agente group', () => {
      const groups = getNavGroups(adminAndRealtor)
      const agenteGroup = groups.find((g) => g.label === 'Agente')!
      expect(itemIds(agenteGroup.items)).toContain('oportunidades')
    })
  })

  describe('internal staff tabs', () => {
    it('adds equipo tab for a team member', () => {
      const ids = itemIds(flatItems(teamMember))
      expect(ids).toContain('equipo')
    })

    it('adds contenido tab for a marketing member', () => {
      const ids = itemIds(flatItems(marketingMember))
      expect(ids).toContain('contenido')
    })

    it('adds numeros tab for a metrics viewer', () => {
      const ids = itemIds(flatItems(metricsViewer))
      expect(ids).toContain('numeros')
    })

    it('adds all internal tabs for admin with all access', () => {
      const allCaps: Capabilities = {
        isAdmin: true,
        isRealtor: false,
        isMetricsViewer: true,
        isTeamMember: true,
        isMarketingMember: true,
      }
      const ids = itemIds(flatItems(allCaps))
      expect(ids).toContain('equipo')
      expect(ids).toContain('contenido')
      expect(ids).toContain('numeros')
    })
  })

  describe('every item has required fields', () => {
    it('all items have id, label, to, and icon', () => {
      for (const caps of [noCaps, realtorOnly, adminOnly, adminAndRealtor]) {
        for (const item of flatItems(caps)) {
          expect(item.id).toBeTruthy()
          expect(item.label).toBeTruthy()
          expect(item.to).toBeTruthy()
          expect(item.icon).toBeDefined()
        }
      }
    })
  })
})

// ---------------------------------------------------------------------------
// getMobileNavItems — max 5 tabs, always ends with miPerfil
// ---------------------------------------------------------------------------
describe('getMobileNavItems', () => {
  it('returns at most 5 items', () => {
    for (const caps of [noCaps, realtorOnly, adminOnly, adminAndRealtor]) {
      expect(getMobileNavItems(caps).length).toBeLessThanOrEqual(5)
    }
  })

  it('always ends with miPerfil', () => {
    for (const caps of [noCaps, realtorOnly, adminOnly, adminAndRealtor]) {
      const items = getMobileNavItems(caps)
      expect(items[items.length - 1]!.id).toBe('miPerfil')
    }
  })

  it('always starts with dashboard', () => {
    for (const caps of [noCaps, realtorOnly, adminOnly, adminAndRealtor]) {
      const items = getMobileNavItems(caps)
      expect(items[0]!.id).toBe('dashboard')
    }
  })

  it('includes oportunidades for realtor', () => {
    const items = getMobileNavItems(realtorOnly)
    expect(itemIds(items)).toContain('oportunidades')
  })

  it('includes aplicaciones for admin', () => {
    const items = getMobileNavItems(adminOnly)
    expect(itemIds(items)).toContain('aplicaciones')
  })

  it('includes both oportunidades and aplicaciones for admin+realtor within 5 items', () => {
    const items = getMobileNavItems(adminAndRealtor)
    const ids = itemIds(items)
    expect(ids).toContain('oportunidades')
    expect(ids).toContain('aplicaciones')
    expect(items.length).toBeLessThanOrEqual(5)
  })

  it('slots in internal tabs for a team member, trimmed to 5', () => {
    const caps: Capabilities = { ...noCaps, isTeamMember: true }
    const items = getMobileNavItems(caps)
    expect(items.length).toBeLessThanOrEqual(5)
    expect(itemIds(items)).toContain('equipo')
  })

  it('returns plain owner tabs when no special caps', () => {
    const items = getMobileNavItems(noCaps)
    const ids = itemIds(items)
    expect(ids).toContain('dashboard')
    expect(ids).toContain('misAnuncios')
    expect(ids).toContain('miPerfil')
  })
})
