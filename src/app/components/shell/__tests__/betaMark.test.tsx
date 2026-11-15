// @vitest-environment jsdom
// Analítica is in beta (Jerson, weekly meeting 2026-11-14; wording approved 2026-11-15):
// every "Analítica" tab or menu label carries a small raised BETA, in brand green.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Capabilities } from '../capabilities'

// The phone bar does not list Analítica today; force it in so the bar's handling is pinned
// for the day it does.
vi.mock('../navItems', async (orig) => {
  const actual = await orig<typeof import('../navItems')>()
  return {
    ...actual,
    getMobileNavItems: (caps: Capabilities) => {
      const items = actual.getMobileNavItems(caps)
      const analitica = actual.getNavGroups(caps).flatMap((g) => g.items).find((i) => i.id === 'analitica')!
      return [...items.slice(0, 2), analitica, ...items.slice(2, 4)]
    },
  }
})

import Sidebar from '../Sidebar'
import BottomTabs from '../BottomTabs'
import { getNavGroups } from '../navItems'

const owner: Capabilities = { isAdmin: false, isRealtor: false, isMetricsViewer: false, isTeamMember: false, isMarketingMember: false }
const allCaps: Capabilities[] = [
  owner,
  { ...owner, isRealtor: true },
  { ...owner, isAdmin: true },
  { ...owner, isAdmin: true, isRealtor: true, isMetricsViewer: true, isTeamMember: true, isMarketingMember: true },
]

function betaIn(link: HTMLElement) {
  return link.querySelector('sup')
}

describe('BETA beside Analítica — the computer menu', () => {
  it.each(allCaps)('the Analítica entry carries a raised BETA (%o)', (caps) => {
    render(<MemoryRouter><Sidebar caps={caps} userName="Ana Pérez" roleLabel="Propietario" onLogout={() => {}} /></MemoryRouter>)
    const link = screen.getByRole('link', { name: /analítica/i })
    const sup = betaIn(link)
    expect(sup).not.toBeNull()
    expect(sup!.textContent).toBe('BETA')
  })

  it('a screen reader hears "Analítica (beta)", not one mashed word', () => {
    render(<MemoryRouter><Sidebar caps={owner} userName="Ana Pérez" roleLabel="Propietario" onLogout={() => {}} /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Analítica (beta)' })).toBeTruthy()
  })

  it('only Analítica carries it', () => {
    render(<MemoryRouter><Sidebar caps={allCaps[3]!} userName="Ana Pérez" roleLabel="Propietario" onLogout={() => {}} /></MemoryRouter>)
    const nav = screen.getByRole('complementary', { name: /navegación principal/i })
    expect(within(nav).getAllByText('BETA')).toHaveLength(1)
  })

  it('is Gotham Medium uppercase in brand green, never orange or a stock colour', () => {
    render(<MemoryRouter><Sidebar caps={owner} userName="Ana Pérez" roleLabel="Propietario" onLogout={() => {}} /></MemoryRouter>)
    const cls = betaIn(screen.getByRole('link', { name: /analítica/i }))!.className.split(/\s+/)
    expect(cls).toEqual(expect.arrayContaining(['font-sans', 'font-medium', 'uppercase', 'text-secondary']))
    expect(cls.some((c) => /^text-primary$|orange|gray-|green-|red-|amber-|blue-/.test(c))).toBe(false)
  })

  it('the nav data marks only Analítica as beta', () => {
    const items = getNavGroups(allCaps[3]!).flatMap((g) => g.items)
    expect(items.filter((i) => i.beta).map((i) => i.id)).toEqual(['analitica'])
  })
})

describe('BETA beside Analítica — the phone bottom tabs', () => {
  it('shows BETA on the Analítica tab', () => {
    render(<MemoryRouter><BottomTabs caps={owner} /></MemoryRouter>)
    const link = screen.getByRole('link', { name: /analítica/i })
    expect(betaIn(link)?.textContent).toBe('BETA')
  })

  // Class-level guard only — jsdom cannot measure wrapping. The real 320 px check is
  // the screenshot taken with Analítica forced into the bar (2026-11-15).
  it('keeps the Analítica tab — and BETA with it — on one line at 320 px', () => {
    render(<MemoryRouter><BottomTabs caps={owner} /></MemoryRouter>)
    const link = screen.getByRole('link', { name: /analítica/i })
    expect(link.className).toContain('whitespace-nowrap')
    const sup = betaIn(link)!
    // BETA sits inside the label line, not as a block of its own that could drop below it.
    expect(sup.parentElement!.className).toContain('whitespace-nowrap')
    expect(sup.className).not.toMatch(/\bblock\b/)
  })

  it('every other tab still says only its label', () => {
    render(<MemoryRouter><BottomTabs caps={owner} /></MemoryRouter>)
    const nav = screen.getByRole('navigation', { name: /navegación móvil/i })
    expect(within(nav).getAllByText('BETA')).toHaveLength(1)
  })
})

// Jerson, 2026-11-15: the raised BETA was cut off in the computer menu — it sat inside the label's
// `truncate` span (overflow hidden), which clipped its top. No ancestor inside the link may clip it.
function clippingAncestor(el: HTMLElement, stopAt: HTMLElement) {
  for (let p = el.parentElement; p && p !== stopAt.parentElement; p = p.parentElement) {
    if (/\b(truncate|overflow-hidden|overflow-clip|line-clamp-\d)\b/.test(p.className)) return p
  }
  return null
}

describe('BETA is never clipped', () => {
  it('the computer menu: no clipping wrapper around BETA', () => {
    render(<MemoryRouter><Sidebar caps={owner} userName="Ana" roleLabel="Usuario" onLogout={() => {}} /></MemoryRouter>)
    const link = screen.getByRole('link', { name: 'Analítica (beta)' })
    expect(clippingAncestor(betaIn(link)!, link)).toBeNull()
  })

  it('the phone bar: no clipping wrapper around BETA', () => {
    render(<MemoryRouter><BottomTabs caps={owner} /></MemoryRouter>)
    const link = screen.getByRole('link', { name: 'Analítica (beta)' })
    expect(clippingAncestor(betaIn(link)!, link)).toBeNull()
  })

  it('BETA is raised by position, not by text baseline (which overflows the line box)', () => {
    render(<MemoryRouter><Sidebar caps={owner} userName="Ana" roleLabel="Usuario" onLogout={() => {}} /></MemoryRouter>)
    const sup = betaIn(screen.getByRole('link', { name: 'Analítica (beta)' }))!
    expect(sup.className).not.toMatch(/\balign-super\b/)
  })
})
