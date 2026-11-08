// @vitest-environment jsdom
// ADR-051 on Mi panel: the owner's two numbers side by side, each with
// Jerson's caption ("veces", never "personas": the same person can count
// again). A total that failed to load shows "—", never 0.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const state = vi.hoisted(() => ({
  listings: { data: undefined as unknown, isLoading: false, isError: false },
  apariciones: { total: 0 as number | undefined, isLoading: false, isError: false },
}))
vi.mock('@/hooks/useListings', () => ({ useUserListingsWithProperties: () => state.listings }))
vi.mock('@/hooks/useListingApariciones', () => ({ useListingsApariciones: () => state.apariciones }))
vi.mock('@/hooks/useBoost', () => ({ useUserBoostPayments: () => ({ data: [] }) }))
vi.mock('@/hooks/useAdmin', () => ({ usePendingRealtorApplicationsCount: () => ({ data: 0 }) }))
vi.mock('@/hooks/useRealtorLeads', () => ({
  useAvailableLeads: () => ({ data: [], isLoading: false }),
  useClaimStatus: () => ({ canClaim: true, remaining: 5, limit: 5 }),
  useAgentAssignments: () => ({ data: [], isLoading: false }),
}))
vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: () => {} }))
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (sel?: (s: unknown) => unknown) => {
    const s = { user: { id: 'u1', name: 'Ana', isVerifiedRealtor: false } }
    return sel ? sel(s) : s
  },
}))

import { OwnerKpis } from '../DashboardPage'

const listing = (id: string, viewCount: number) => ({
  listing: { id, status: 'active', viewCount, isBoosted: false },
  property: {},
})

beforeEach(() => {
  state.listings = { data: [listing('L1', 10), listing('L2', 2)], isLoading: false, isError: false }
  state.apariciones = { total: 345, isLoading: false, isError: false }
})

describe('Mi panel — Las abrieron and Se mostraron', () => {
  it('shows total Apariciones with its caption', () => {
    render(<MemoryRouter><OwnerKpis userId="u1" /></MemoryRouter>)
    expect(screen.getByText('Se mostraron')).toBeTruthy()
    expect(screen.getByText('345')).toBeTruthy()
    expect(screen.getAllByText('veces en total').length).toBe(2)
  })

  it('Vistas keeps its total and gets its caption', () => {
    render(<MemoryRouter><OwnerKpis userId="u1" /></MemoryRouter>)
    expect(screen.getByText('Las abrieron')).toBeTruthy()
    expect(screen.getByText('12')).toBeTruthy()
  })

  it('never says "personas"', () => {
    const { container } = render(<MemoryRouter><OwnerKpis userId="u1" /></MemoryRouter>)
    expect(container.textContent).not.toMatch(/personas/i)
  })

  it('Apariciones that failed to load show "—", not 0', () => {
    state.apariciones = { total: undefined, isLoading: false, isError: true }
    render(<MemoryRouter><OwnerKpis userId="u1" /></MemoryRouter>)
    const card = screen.getByText('Se mostraron').closest('div')!.parentElement!
    expect(card.textContent).toContain('—')
    expect(card.textContent).not.toMatch(/\b0\b/)
  })

  it('never shows the old words', () => {
    const { container } = render(<MemoryRouter><OwnerKpis userId="u1" /></MemoryRouter>)
    expect(container.textContent).not.toMatch(/vistas|aparici/i)
  })

  it('no Vistas yet: the hint asks to share, without the old word', () => {
    state.listings = { data: [listing('L1', 0)], isLoading: false, isError: false }
    render(<MemoryRouter><OwnerKpis userId="u1" /></MemoryRouter>)
    expect(screen.getByText('Comparte tus anuncios para que más personas los abran')).toBeTruthy()
  })

  it('an owner with no listings yet keeps the "first listing" note', () => {
    state.listings = { data: [], isLoading: false, isError: false }
    state.apariciones = { total: 0, isLoading: false, isError: false }
    render(<MemoryRouter><OwnerKpis userId="u1" /></MemoryRouter>)
    expect(screen.getAllByText('Crea tu primer anuncio para empezar').length).toBeGreaterThan(0)
  })
})
