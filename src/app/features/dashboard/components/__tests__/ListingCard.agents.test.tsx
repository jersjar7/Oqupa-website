// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

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

const agentsLinks = () =>
  screen.queryAllByRole('link').filter((a) => a.getAttribute('href') === '/app/listings/L1/agents')

describe('ListingCard — agents', () => {
  it('with an agent assigned, the card still leads to the agents page', () => {
    setup({ wantsRealtorHelp: true, assignedRealtorId: 'R1', assignmentStatus: 'accepted', currentClaimsCount: 1 })
    expect(agentsLinks()).toHaveLength(1)
    expect(agentsLinks()[0]!.textContent).toContain('Agente asignado')
  })

  it('an agent assigned with the help request since turned off is still reachable', () => {
    setup({ wantsRealtorHelp: false, assignedRealtorId: 'R1', assignmentStatus: 'accepted' })
    expect(agentsLinks()).toHaveLength(1)
  })

  it('waiting for agents: unchanged', () => {
    setup({ wantsRealtorHelp: true })
    expect(agentsLinks()).toHaveLength(1)
    expect(agentsLinks()[0]!.textContent).toContain('Esperando agentes...')
  })

  it('no agent help and no agent: nothing', () => {
    setup({})
    expect(agentsLinks()).toHaveLength(0)
  })
})
