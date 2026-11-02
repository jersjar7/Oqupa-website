// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * Owner lifecycle on the card (audit 2026-11-02, section E; ADR-046 #14):
 * a Vendido/Alquilado listing can be deleted directly; putting a listing back
 * on the map is "Volver a publicar" everywhere and always asks first, as the
 * app does.
 */

const { markClosedMutate, toggleMutate, deleteMutate } = vi.hoisted(() => ({ markClosedMutate: vi.fn(), toggleMutate: vi.fn(), deleteMutate: vi.fn() }))

vi.mock('@/hooks/useListings', () => ({
  useToggleListingStatus: () => ({ mutate: toggleMutate, isPending: false }),
  useDeleteListing: () => ({ mutate: deleteMutate, isPending: false }),
  useMarkListingClosed: () => ({ mutate: markClosedMutate, isPending: false }),
  useSetRealtorHelp: () => ({ mutate: () => {}, isPending: false }),
}))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ setQueryData: vi.fn() }) }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ user: { id: 'owner-1' } }) }))
vi.mock('@/components/ShareFormatModal', () => ({ default: () => null }))
vi.mock('@/app/features/boost/components/BoostStatusBadge', () => ({ default: () => null }))
vi.mock('@/app/features/boost/components/BoostPurchaseFlow', () => ({ default: () => null }))
vi.mock('../CloseSurveyModal', () => ({
  default: ({ isOpen, isRental, listingId }: { isOpen: boolean; isRental: boolean; listingId: string }) =>
    isOpen ? <div data-testid="survey" data-rental={String(isRental)} data-listing={listingId} /> : null,
}))
vi.mock('@/app/components/ui', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children, onClick, isLoading: _l, variant: _v, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean; variant?: string }) => (
    <button onClick={onClick} {...rest}>{children}</button>
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

function setup(status: string, boost: { isBoosted: boolean; boostedUntil?: Date } = { isBoosted: false }) {
  const listing = {
    id: 'L1', propertyId: 'P1', status, viewCount: 0, ...boost,
    price: { amount: 100, currency: 'PEN' }, description: '', wantsRealtorHelp: false, currentClaimsCount: 0,
  } as unknown as Listing
  const property = {
    operationType: 'venta', propertyType: 'casa', location: { distrito: 'Castilla' },
    specs: { totalAreaInSquareMeters: 0 }, media: { photoKeys: [] },
  } as unknown as Property
  render(<ListingCard listing={listing} property={property} />)
}

describe('ListingCard — lifecycle', () => {
  beforeEach(() => {
    toggleMutate.mockReset()
    deleteMutate.mockReset()
  })

  it.each(['sold', 'rented'])('a %s listing can be deleted directly, after confirming', (status) => {
    setup(status)
    fireEvent.click(screen.getByRole('button', { name: /Eliminar/ }))
    expect(deleteMutate).not.toHaveBeenCalled()
    expect(screen.getByText(/Esta acción no se puede deshacer/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sí, eliminar' }))
    expect(deleteMutate).toHaveBeenCalledWith({ listingId: 'L1', propertyId: 'P1' }, expect.anything())
  })

  it('an active listing cannot be deleted from the card', () => {
    setup('active')
    expect(screen.queryByRole('button', { name: /Eliminar/ })).toBeNull()
  })

  it('a deactivated listing is put back with "Volver a publicar", after confirming', () => {
    setup('deactivated')
    expect(screen.queryByRole('button', { name: /^Activar/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Volver a publicar/ }))
    expect(toggleMutate).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Sí, volver a publicar' }))
    expect(toggleMutate).toHaveBeenCalledWith({ listingId: 'L1', currentStatus: 'deactivated' }, expect.anything())
  })

  // Review 2026-11-02: an old 'expired' listing reads Desactivado (ADR-014),
  // so it gets the same actions.
  it('an expired listing can be put back and deleted, like a deactivated one', () => {
    setup('expired')
    expect(screen.getByRole('button', { name: /Volver a publicar/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Eliminar/ })).toBeTruthy()
  })
})
