// @vitest-environment jsdom
// ADR-043 D10: "Ayuda de agentes" left the publishing wizard. It is offered
// after publishing, on the owner's card in Mis Propiedades, and stays off
// unless the owner turns it on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const setHelp = vi.hoisted(() => ({ mutate: vi.fn(), isPending: false }))
vi.mock('@/hooks/useListings', () => ({
  useToggleListingStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteListing: () => ({ mutate: vi.fn(), isPending: false }),
  useMarkListingClosed: () => ({ mutate: vi.fn(), isPending: false }),
  useSetRealtorHelp: () => setHelp,
}))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ setQueryData: vi.fn() }) }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ user: { id: 'owner-1' } }) }))
vi.mock('@/components/ShareFormatModal', () => ({ default: () => null }))
vi.mock('@/app/features/boost/components/BoostStatusBadge', () => ({ default: () => null }))
vi.mock('@/app/features/boost/components/BoostPurchaseFlow', () => ({ default: () => null }))
vi.mock('../CloseSurveyModal', () => ({ default: () => null }))
vi.mock('@/app/components/ui', () => ({
  Button: ({ children, onClick }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick}>{children}</button>
  ),
  PhotoCarousel: () => null,
  PhotoOverlayBadge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}))

import ListingCard from '../ListingCard'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'

function setup(listing: Partial<Listing>, operationType: 'venta' | 'alquiler' = 'venta') {
  const l = {
    id: 'L1', propertyId: 'P1', status: 'active', viewCount: 0, isBoosted: false,
    price: { amount: 100, currency: 'PEN' }, description: '', wantsRealtorHelp: false, currentClaimsCount: 0,
    ...listing,
  } as unknown as Listing
  const property = {
    operationType, propertyType: 'casa', location: { distrito: 'Castilla' },
    specs: { totalAreaInSquareMeters: 0 }, media: { photoKeys: [] },
  } as unknown as Property
  render(<ListingCard listing={l} property={property} />)
}

const btn = (name: string | RegExp) => screen.getByRole('button', { name })

describe('ListingCard — agent help after publishing (D10)', () => {
  beforeEach(() => setHelp.mutate.mockReset())

  // Jerson 2026-11-08 (the card with one main button and ⋯): the app's box —
  // the explanation and SÍ, ACTIVAR are on the card, no extra click first.
  it('off: AYUDA DE AGENTES explains on the card; nothing changes until Sí, activar', () => {
    setup({})
    expect(screen.getByText('AYUDA DE AGENTES')).toBeTruthy()
    expect(
      screen.getByText('Agentes verificados por Oqupa podrán ofrecerte ayuda para vender tu propiedad. Hasta 3 agentes podrán contactarte y tú siempre eliges con quién trabajar. Oqupa no cobra comisiones por este servicio.'),
    ).toBeTruthy()
    expect(setHelp.mutate).not.toHaveBeenCalled()
    fireEvent.click(btn('Sí, activar'))
    expect(setHelp.mutate).toHaveBeenCalledWith({ listingId: 'L1', on: true })
  })

  it('a rental says "alquilar", never "vender"', () => {
    setup({}, 'alquiler')
    expect(screen.getByText(/ayuda para alquilar tu propiedad/)).toBeTruthy()
    expect(screen.queryByText(/vender/)).toBeNull()
  })

  // Hostile review 2026-11-02 #5: turning it off releases and notifies the
  // agents, so it asks first, with the app's words, never on one tap.
  it('on: turning it off asks first, with the app\'s warning when agents are interested', () => {
    setup({ wantsRealtorHelp: true, currentClaimsCount: 2 })
    expect(screen.queryByText('AYUDA DE AGENTES')).toBeNull()
    const off = btn('Desactivar ayuda de agentes')
    expect(off.className).toMatch(/\bmin-h-11\b/)
    fireEvent.click(off)
    expect(setHelp.mutate).not.toHaveBeenCalled()
    expect(screen.getByText('¿Desactivar la ayuda de agentes?')).toBeTruthy()
    expect(screen.getByText('2 agentes están interesados en trabajar contigo. Si guardas este cambio, dejarán de ver tu anuncio y se les avisará.')).toBeTruthy()
    fireEvent.click(btn('Sí, desactivar'))
    expect(setHelp.mutate).toHaveBeenCalledWith({ listingId: 'L1', on: false }, expect.anything())
  })

  // Jerson 2026-11-02: when on, say how many agents may get in touch and
  // that the owner chooses — the listing's own limit, as the app does.
  it('on: says up to how many agents may contact, and that the owner chooses', () => {
    setup({ wantsRealtorHelp: true, maxRealtors: 3 })
    expect(screen.getByText('Hasta 3 agentes pueden contactarte. Tú eliges con quién trabajar.')).toBeTruthy()
  })

  it('on: the number is the listing\'s own limit; one is singular', () => {
    setup({ wantsRealtorHelp: true, maxRealtors: 1 })
    expect(screen.getByText('Hasta 1 agente puede contactarte. Tú eliges con quién trabajar.')).toBeTruthy()
  })

  it('off: the line is not shown before help is on', () => {
    setup({ maxRealtors: 3 })
    expect(screen.queryByText(/pueden contactarte/)).toBeNull()
  })

  it('turning it off can be cancelled', () => {
    setup({ wantsRealtorHelp: true })
    fireEvent.click(btn('Desactivar ayuda de agentes'))
    fireEvent.click(btn('Cancelar'))
    expect(setHelp.mutate).not.toHaveBeenCalled()
    expect(screen.queryByText('¿Desactivar la ayuda de agentes?')).toBeNull()
  })

  it('with an agent assigned, no switch (the agents page handles it)', () => {
    setup({ wantsRealtorHelp: true, assignedRealtorId: 'R1', assignmentStatus: 'accepted' })
    expect(screen.queryByText('AYUDA DE AGENTES')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Desactivar ayuda de agentes' })).toBeNull()
  })

  it('not offered on a listing that is not active', () => {
    setup({ status: 'deactivated' })
    expect(screen.queryByText('AYUDA DE AGENTES')).toBeNull()
  })
})
