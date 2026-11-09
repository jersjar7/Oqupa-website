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

function setup(viewCount: number, apariciones?: number, propertyType = 'casa') {
  const listing = {
    id: 'L1', propertyId: 'P1', status: 'active', viewCount, isBoosted: false,
    price: { amount: 250000, currency: 'PEN' }, description: '', wantsRealtorHelp: false, currentClaimsCount: 0,
  } as unknown as Listing
  const property = {
    operationType: 'venta', propertyType, location: { distrito: 'Castilla' },
    specs: { totalAreaInSquareMeters: 0 }, media: { photoKeys: [] },
  } as unknown as Property
  render(<ListingCard listing={listing} property={property} apariciones={apariciones} />)
}

describe('ListingCard — La abrieron and Se mostró', () => {
  it('shows both numbers', () => {
    setup(12, 210)
    expect(screen.getByText('La abrieron 12 veces')).toBeTruthy()
    expect(screen.getByText('Se mostró 210 veces')).toBeTruthy()
  })

  it('one of each reads "1 vez"', () => {
    setup(1, 1)
    expect(screen.getByText('La abrieron 1 vez')).toBeTruthy()
    expect(screen.getByText('Se mostró 1 vez')).toBeTruthy()
  })

  it('zero Apariciones is shown as 0 when it is known', () => {
    setup(0, 0)
    expect(screen.getByText('Se mostró 0 veces')).toBeTruthy()
  })

  it('a departamento reads "Lo abrieron"', () => {
    setup(5, 7, 'departamento')
    expect(screen.getByText('Lo abrieron 5 veces')).toBeTruthy()
    expect(screen.getByText('Se mostró 7 veces')).toBeTruthy()
  })

  it('unknown Apariciones (still loading or failed) is not shown as 0', () => {
    setup(4)
    expect(screen.getByText('La abrieron 4 veces')).toBeTruthy()
    expect(screen.queryByText(/Se mostró/)).toBeNull()
  })
})
