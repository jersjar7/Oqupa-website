// @vitest-environment jsdom
// Agentes interesados (audit 2026-11-02, section G): choosing an agent sends
// an invitation — the dialog says so in the app's words; a pending invitation
// is cancelled, not "removed"; a deleted listing says so instead of bouncing;
// the page links to Buenas prácticas (ADR-046 #20).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const state = vi.hoisted(() => ({
  details: { isLoading: false, data: undefined as unknown },
  claims: { data: [] as unknown[], isLoading: false, isError: false, refetch: () => {} },
  assign: vi.fn(),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ user: { id: 'owner-1' } }),
}))
vi.mock('@/hooks/useListings', () => ({ useListingDetails: () => state.details }))
vi.mock('@/hooks/useRealtorLeads', () => ({
  useListingClaims: () => state.claims,
  useAssignRealtor: () => ({ mutate: state.assign, isPending: false }),
  useUnassignRealtor: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@/app/components/ui', async () => {
  const Button = ({ children, onClick, isLoading: _l, variant: _v, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean; variant?: string }) => (
    <button onClick={onClick} {...rest}>{children}</button>
  )
  return {
    Button,
    Spinner: () => null,
    Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    Modal: ({ isOpen, title, children }: { isOpen: boolean; title?: string; children: React.ReactNode }) =>
      isOpen ? <div role="dialog" aria-label={title}><h2>{title}</h2>{children}</div> : null,
  }
})

import InterestedAgentsPage from '../InterestedAgentsPage'

const CLAIM = {
  id: 'c1', realtorId: 'r1', realtorName: 'Ana', realtorPhone: '+51 900 000 000',
  realtorBusinessName: '', claimedAt: new Date(),
}

function listingWith(extra: Record<string, unknown> = {}) {
  return {
    listing: {
      id: 'L1', ownerId: 'owner-1', description: '', viewCount: 0, maxRealtors: 3,
      price: { amount: 100, currency: 'PEN' }, ...extra,
    },
    property: {
      operationType: 'venta', propertyType: 'casa', location: { distrito: 'Castilla' },
      media: { photoKeys: [], propertyPhotoUrls: [] },
    },
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/listings/L1/agents']}>
      <Routes>
        <Route path="/app/listings/:id/agents" element={<InterestedAgentsPage />} />
        <Route path="/app" element={<p>DASHBOARD</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('InterestedAgentsPage', () => {
  beforeEach(() => {
    state.claims = { data: [CLAIM], isLoading: false, isError: false, refetch: () => {} }
    state.assign.mockReset()
  })

  it('a deleted listing says so, with a way back, instead of bouncing to the dashboard', () => {
    state.details = { isLoading: false, data: undefined }
    renderPage()
    expect(screen.getByText('Esta publicación ya no existe.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Volver' })).toBeTruthy()
    expect(screen.queryByText('DASHBOARD')).toBeNull()
  })

  it('choosing an agent says it sends an invitation, in the app words', () => {
    state.details = { isLoading: false, data: listingWith() }
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /trabajar|asignar/i }))
    expect(screen.getByText(/¿Quieres trabajar con/)).toBeTruthy()
    expect(screen.getByText('Le enviaremos una invitación. Debe aceptarla para representar tu propiedad.')).toBeTruthy()
    expect(screen.getByText(/Oqupa no es responsable del trato/)).toBeTruthy()
    expect(screen.queryByText(/reemplazará al tuyo como contacto principal del anuncio$/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }))
    expect(state.assign).toHaveBeenCalledWith(
      expect.objectContaining({ listingId: 'L1', realtorId: 'r1', realtorName: 'Ana' }),
      expect.anything(),
    )
  })

  it('a pending invitation is cancelled, not removed', () => {
    state.details = { isLoading: false, data: listingWith({ assignedRealtorId: 'r1', assignmentStatus: 'pending_acceptance' }) }
    renderPage()
    expect(screen.getByRole('button', { name: 'Cancelar invitación' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /quitar agente/i })).toBeNull()
  })

  it('an accepted agent is removed', () => {
    state.details = { isLoading: false, data: listingWith({ assignedRealtorId: 'r1', assignmentStatus: 'accepted' }) }
    renderPage()
    expect(screen.getByRole('button', { name: 'Quitar agente' })).toBeTruthy()
  })

  it('links to Buenas prácticas', () => {
    state.details = { isLoading: false, data: listingWith() }
    renderPage()
    expect(screen.getByRole('link', { name: /buenas prácticas/i }).getAttribute('href')).toBe('/app/buenas-practicas')
  })
})
