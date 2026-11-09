// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * The owner's way to their listing's agents page ("Quitar agente", the
 * interested agents) must stay open once an agent is assigned. The card used
 * to turn into a plain "Agente asignado" label with no link, so on the website
 * an owner could not release an agent at all — the same lock-out the app fixed
 * as bug B3 (property_owner_card.dart: showAgents = wantsRealtorHelp ||
 * assignedRealtorId != null).
 */

vi.mock('@/hooks/useListings', () => ({
  useToggleListingStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteListing: () => ({ mutate: vi.fn(), isPending: false }),
  useMarkListingClosed: () => ({ mutate: vi.fn(), isPending: false }),
  useSetRealtorHelp: () => ({ mutate: vi.fn(), isPending: false }),
}))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ setQueryData: vi.fn() }) }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ user: { id: 'owner-1' } }) }))
vi.mock('@/components/ShareFormatModal', () => ({ default: () => null }))
vi.mock('@/app/features/boost/components/BoostStatusBadge', () => ({ default: () => null }))
vi.mock('@/app/features/boost/components/BoostPurchaseFlow', () => ({ default: () => null }))
vi.mock('../CloseSurveyModal', () => ({ default: () => null }))
vi.mock('@/app/components/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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

function setup(listing: Partial<Listing>) {
  const l = {
    id: 'L1', propertyId: 'P1', status: 'active', viewCount: 0, isBoosted: false,
    price: { amount: 100, currency: 'PEN' }, description: '', wantsRealtorHelp: false, currentClaimsCount: 0,
    ...listing,
  } as unknown as Listing
  const property = {
    operationType: 'venta', propertyType: 'casa', location: { distrito: 'Castilla' },
    specs: { totalAreaInSquareMeters: 0 }, media: { photoKeys: [] },
  } as unknown as Property
  render(<ListingCard listing={l} property={property} />)
}

// Since 2026-11-08 the agents page is reached from the card's ⋯ menu, as in
// the app ("Ver agentes interesados (N)").
const agentsLinks = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Más opciones' }))
  return screen.queryAllByRole('link').filter((a) => a.getAttribute('href') === '/app/listings/L1/agents')
}

describe('ListingCard — agents', () => {
  it('with an agent assigned, the card still leads to the agents page', () => {
    setup({ wantsRealtorHelp: true, assignedRealtorId: 'R1', assignmentStatus: 'accepted', currentClaimsCount: 1 })
    const links = agentsLinks()
    expect(links).toHaveLength(1)
    expect(links[0]!.textContent).toBe('Ver agentes interesados (1)')
  })

  it('an agent assigned with the help request since turned off is still reachable', () => {
    setup({ wantsRealtorHelp: false, assignedRealtorId: 'R1', assignmentStatus: 'accepted' })
    expect(agentsLinks()).toHaveLength(1)
  })

  it('waiting for agents: the entry is there with 0', () => {
    setup({ wantsRealtorHelp: true })
    const links = agentsLinks()
    expect(links).toHaveLength(1)
    expect(links[0]!.textContent).toBe('Ver agentes interesados (0)')
  })

  it('no agent help and no agent: nothing', () => {
    setup({})
    expect(agentsLinks()).toHaveLength(0)
  })
})
