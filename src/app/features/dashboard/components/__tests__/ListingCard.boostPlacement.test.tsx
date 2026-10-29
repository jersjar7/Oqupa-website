// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Metrics plan A9: the boost offer on "Mis propiedades" is reported as
 * placement `my_listings`.
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
vi.mock('@/app/features/boost/components/BoostPurchaseFlow', () => ({
  default: ({ placement }: { placement: string }) => <div data-testid="boost-flow" data-placement={placement} />,
}))
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
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import ListingCard from '../ListingCard'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'

describe('ListingCard — boost placement', () => {
  it('passes my_listings to the boost flow', () => {
    const listing = {
      id: 'L1', propertyId: 'P1', status: 'active', viewCount: 0, isBoosted: false,
      price: { amount: 100, currency: 'PEN' }, description: '', wantsRealtorHelp: false, currentClaimsCount: 0,
    } as unknown as Listing
    const property = {
      operationType: 'venta', propertyType: 'casa', location: { distrito: 'Castilla' },
      specs: { totalAreaInSquareMeters: 0 }, media: { photoKeys: [] },
    } as unknown as Property
    render(<ListingCard listing={listing} property={property} />)
    expect(screen.getByTestId('boost-flow').dataset.placement).toBe('my_listings')
  })
})
