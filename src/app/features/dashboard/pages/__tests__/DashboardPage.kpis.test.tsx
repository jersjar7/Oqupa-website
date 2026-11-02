// @vitest-environment jsdom
// Mi Panel (audit 2026-11-02, E): a failed load shows "—" and says so, never
// zeros; Spanish words, not "Boosts" / "Claims".
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const state = vi.hoisted(() => ({ listings: { data: undefined as unknown, isLoading: false, isError: true } }))
vi.mock('@/hooks/useListings', () => ({ useUserListingsWithProperties: () => state.listings }))
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

describe('DashboardPage KPIs', () => {
  it('a failed load is not zero', () => {
    render(<MemoryRouter><OwnerKpis userId="u1" /></MemoryRouter>)
    expect(screen.getByText('No pudimos cargar tus números. Recarga la página.')).toBeTruthy()
    expect(screen.queryByText('Crea tu primer anuncio para empezar')).toBeNull()
  })
  it('says Destacados, not Boosts', () => {
    render(<MemoryRouter><OwnerKpis userId="u1" /></MemoryRouter>)
    expect(screen.getByText('Destacados activos')).toBeTruthy()
    expect(screen.queryByText(/Boosts/)).toBeNull()
  })
})
