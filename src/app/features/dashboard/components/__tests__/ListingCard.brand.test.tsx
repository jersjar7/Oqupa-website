// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * Brand spec (audit C4, 2026-10-31): the owner card's price is the card's
 * headline — brand green, Roboto Serif Regular, as in the app. Never orange
 * (orange text on white/cream fails contrast).
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

function setup(status: string) {
  const listing = {
    id: 'L1', propertyId: 'P1', status, viewCount: 0, isBoosted: false,
    price: { amount: 250000, currency: 'PEN' }, description: '', wantsRealtorHelp: false, currentClaimsCount: 0,
  } as unknown as Listing
  const property = {
    operationType: 'venta', propertyType: 'casa', location: { distrito: 'Castilla' },
    specs: { totalAreaInSquareMeters: 0 }, media: { photoKeys: [] },
  } as unknown as Property
  render(<ListingCard listing={listing} property={property} />)
}

describe('ListingCard — brand spec', () => {
  it('the price is green Roboto Serif Regular, not orange', () => {
    setup('active')
    const price = screen.getByText(/250/)
    expect(price.className).toMatch(/\bfont-serif\b/)
    expect(price.className).toMatch(/\bfont-normal\b/)
    expect(price.className).toMatch(/\btext-secondary\b/)
    expect(price.className).not.toMatch(/(^|\s)text-primary(\s|$)/)
  })

  it('a deactivated listing gets the neutral status dot', () => {
    setup('deactivated')
    expect(screen.getByTestId('status').dataset.tone).toBe('neutral')
  })
})
