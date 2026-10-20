// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

/**
 * Marking a listing Vendido / Alquilado from the website (2026-10-20). Until
 * now only the app could; the close survey opens right after.
 */

const { markClosedMutate } = vi.hoisted(() => ({ markClosedMutate: vi.fn() }))

vi.mock('@/hooks/useListings', () => ({
  useToggleListingStatus: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteListing: () => ({ mutate: vi.fn(), isPending: false }),
  useMarkListingClosed: () => ({ mutate: markClosedMutate, isPending: false }),
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

function setup(status: string, operationType: 'venta' | 'alquiler') {
  const listing = {
    id: 'L1', propertyId: 'P1', status, viewCount: 0, isBoosted: false,
    price: { amount: 100, currency: 'PEN' }, description: '', wantsRealtorHelp: false, currentClaimsCount: 0,
  } as unknown as Listing
  const property = {
    operationType, propertyType: 'casa', location: { distrito: 'Castilla' },
    specs: { totalAreaInSquareMeters: 0 }, media: { photoKeys: [] },
  } as unknown as Property
  render(<ListingCard listing={listing} property={property} />)
}

describe('ListingCard — Vendido / Alquilado', () => {
  beforeEach(() => markClosedMutate.mockReset())

  it('a listing for sale can be marked sold, after confirming, and then asks the survey', () => {
    setup('active', 'venta')
    fireEvent.click(screen.getByRole('button', { name: /Marcar como vendido/ }))
    expect(screen.getByText('¿Ya vendiste la propiedad? La publicación se cerrará.')).toBeTruthy()
    expect(markClosedMutate).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Sí, vendido' }))
    expect(markClosedMutate).toHaveBeenCalledWith(
      { listingId: 'L1', status: 'sold' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(screen.queryByTestId('survey')).toBeNull()

    act(() => markClosedMutate.mock.calls[0]![1].onSuccess())
    expect(screen.getByTestId('survey').dataset.rental).toBe('false')
    expect(screen.getByTestId('survey').dataset.listing).toBe('L1')
  })

  it('a rental is marked rented, with the app\'s wording', () => {
    setup('active', 'alquiler')
    expect(screen.queryByRole('button', { name: /Marcar como vendido/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Marcar como alquilado/ }))
    expect(screen.getByText(/¿Ya encontraste inquilino\?/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sí, alquilado' }))
    expect(markClosedMutate.mock.calls[0]![0]).toEqual({ listingId: 'L1', status: 'rented' })
    act(() => markClosedMutate.mock.calls[0]![1].onSuccess())
    expect(screen.getByTestId('survey').dataset.rental).toBe('true')
  })

  it('Cancelar closes the confirmation and changes nothing', () => {
    setup('active', 'venta')
    fireEvent.click(screen.getByRole('button', { name: /Marcar como vendido/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('¿Ya vendiste la propiedad? La publicación se cerrará.')).toBeNull()
    expect(markClosedMutate).not.toHaveBeenCalled()
  })

  it.each(['deactivated', 'sold', 'rented'])('a %s listing offers no Vendido/Alquilado action, like the app', (status) => {
    setup(status, 'venta')
    expect(screen.queryByRole('button', { name: /Marcar como/ })).toBeNull()
  })
})
