// @vitest-environment jsdom
// Oportunidades (audit 2026-11-02, section G; ADR-046 #20).
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const q = (over: Record<string, unknown> = {}) => ({ data: [], isLoading: false, isError: false, refetch: vi.fn(), ...over })
const state = vi.hoisted(() => ({ assignments: null as unknown }))

vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: () => {} }))
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ user: { id: 'agent-1', isVerifiedRealtor: true } }),
}))
vi.mock('@/hooks/useRealtorLeads', () => ({
  useAvailableLeads: () => q(),
  useClaimedLeads: () => q(),
  useAgentAssignments: () => state.assignments,
  useClaimLead: () => ({ mutate: vi.fn(), isPending: false }),
  useClaimStatus: () => ({ canClaim: true, remaining: 5, limit: 5 }),
  useAcceptAssignment: () => ({ mutate: vi.fn(), isPending: false }),
  useDeclineAssignment: () => ({ mutate: vi.fn(), isPending: false }),
}))

import LeadsPage from '../LeadsPage'

describe('LeadsPage', () => {
  // Same pipeline words as the app (feature audit 2026-11-02; the app pins
  // them in agent_pipeline_words_test.dart).
  it('the tabs are Disponibles, En espera and Invitaciones', () => {
    state.assignments = q()
    render(<MemoryRouter><LeadsPage /></MemoryRouter>)
    const tabs = screen.getAllByRole('tab').map((t) => t.textContent?.replace(/\d+/g, '').trim())
    expect(tabs).toEqual(['Disponibles', 'En espera', 'Invitaciones'])
  })

  it('links to Buenas prácticas', () => {
    state.assignments = q()
    render(<MemoryRouter><LeadsPage /></MemoryRouter>)
    expect(screen.getByRole('link', { name: /buenas prácticas/i }).getAttribute('href')).toBe('/app/buenas-practicas')
  })

  it('a failed invitations load is an error with Reintentar, not "no invitations"', () => {
    state.assignments = q({ isError: true, data: undefined })
    render(<MemoryRouter initialEntries={['/app/leads?tab=invitaciones']}><LeadsPage /></MemoryRouter>)
    expect(screen.getByText('No pudimos cargar tus invitaciones. Revisa tu internet.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
    expect(screen.queryByText('No tienes invitaciones pendientes')).toBeNull()
  })
})
