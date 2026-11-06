// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * ADR-051: on Mis propiedades each card shows its Apariciones next to its
 * Vistas — the owner's two numbers. Apariciones comes from the owner-only
 * total the page loads; while it is unknown the card shows only Vistas
 * rather than a false 0.
 */

vi.mock('@/hooks/useListings', () => ({
  useToggleListingStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteListing: () => ({ mutate: vi.fn(), isPending: false }),
  useMarkListingClosed: () => ({ mutate: vi.fn(), isPending: false }),
  useSetRealtorHelp: () => ({ mutate: () => {}, isPending: false }),
}))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ setQueryData: vi.fn() }) }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ user: { id: 'owner-1' } }) }))
vi.mock('@/components/ShareFormatModal', () => ({ default: () => null }))
vi.mock('@/app/features/boost/components/BoostStatusBadge', () => ({ default: () => null }))
vi.mock('@/app/features/boost/components/BoostPurchaseFlow', () => ({ default: () => null }))
vi.mock('../CloseSurveyModal', () => ({ default: () => null }))
vi.mock('@/app/components/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  PhotoCarousel: () => null,
  PhotoOverlayBadge: ({ children, tone }: { children: React.ReactNode; tone?: string }) => (
    <span data-testid="status" data-tone={tone}>{children}</span>
  ),
}))
vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import ListingCard from '../ListingCard'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'

function setup(viewCount: number, apariciones?: number) {
  const listing = {
    id: 'L1', propertyId: 'P1', status: 'active', viewCount, isBoosted: false,
    price: { amount: 250000, currency: 'PEN' }, description: '', wantsRealtorHelp: false, currentClaimsCount: 0,
  } as unknown as Listing
  const property = {
    operationType: 'venta', propertyType: 'casa', location: { distrito: 'Castilla' },
    specs: { totalAreaInSquareMeters: 0 }, media: { photoKeys: [] },
  } as unknown as Property
  render(<ListingCard listing={listing} property={property} apariciones={apariciones} />)
}

describe('ListingCard — Vistas and Apariciones', () => {
  it('shows both numbers', () => {
    setup(12, 210)
    expect(screen.getByText('12 vistas')).toBeTruthy()
    expect(screen.getByText('210 apariciones')).toBeTruthy()
  })

  it('one of each reads in the singular, with its accent', () => {
    setup(1, 1)
    expect(screen.getByText('1 vista')).toBeTruthy()
    expect(screen.getByText('1 aparición')).toBeTruthy()
  })

  it('zero Apariciones is shown as 0 when it is known', () => {
    setup(0, 0)
    expect(screen.getByText('0 apariciones')).toBeTruthy()
  })

  it('unknown Apariciones (still loading or failed) is not shown as 0', () => {
    setup(4)
    expect(screen.getByText('4 vistas')).toBeTruthy()
    expect(screen.queryByText(/aparici/)).toBeNull()
  })
})
