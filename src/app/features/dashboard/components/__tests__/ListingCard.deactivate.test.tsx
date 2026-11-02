// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

/**
 * Desactivar on a BOOSTED listing (2026-10-31). It used to happen in one click
 * while the paid days kept running — nothing pauses or returns them (the
 * expiry job ignores status). Now it asks first and says so.
 */

const { markClosedMutate, toggleMutate } = vi.hoisted(() => ({ markClosedMutate: vi.fn(), toggleMutate: vi.fn() }))

vi.mock('@/hooks/useListings', () => ({
  useToggleListingStatus: () => ({ mutate: toggleMutate, isPending: false }),
  useDeleteListing: () => ({ mutate: vi.fn(), isPending: false }),
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

function setup(status: string, boost: { isBoosted: boolean; boostedUntil?: Date }) {
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

describe('ListingCard — Desactivar a boosted listing', () => {
  beforeEach(() => {
    toggleMutate.mockReset()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-31T12:00:00Z'))
  })
  afterEach(() => vi.useRealTimers())

  it('asks first, saying the paid days keep running', () => {
    setup('active', { isBoosted: true, boostedUntil: new Date('2026-11-05T12:00:00Z') })
    fireEvent.click(screen.getByRole('button', { name: /Desactivar/ }))
    expect(toggleMutate).not.toHaveBeenCalled()
    expect(screen.getByText('¿Desactivar esta publicación?')).toBeTruthy()
    expect(
      screen.getByText('Te quedan 5 días de destacado. Siguen corriendo mientras esté desactivada.'),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Sí, desactivar' }))
    expect(toggleMutate).toHaveBeenCalledWith(
      { listingId: 'L1', currentStatus: 'active' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('one day left reads in the singular', () => {
    setup('active', { isBoosted: true, boostedUntil: new Date('2026-11-01T06:00:00Z') })
    fireEvent.click(screen.getByRole('button', { name: /Desactivar/ }))
    expect(
      screen.getByText('Te queda 1 día de destacado. Sigue corriendo mientras esté desactivada.'),
    ).toBeTruthy()
  })

  it('without an end date, still warns', () => {
    setup('active', { isBoosted: true })
    fireEvent.click(screen.getByRole('button', { name: /Desactivar/ }))
    expect(
      screen.getByText('Los días de tu destacado siguen corriendo mientras esté desactivada.'),
    ).toBeTruthy()
  })

  it('Cancelar changes nothing', () => {
    setup('active', { isBoosted: true, boostedUntil: new Date('2026-11-05T12:00:00Z') })
    fireEvent.click(screen.getByRole('button', { name: /Desactivar/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('¿Desactivar esta publicación?')).toBeNull()
    expect(toggleMutate).not.toHaveBeenCalled()
  })

  it('a listing that is not boosted is still deactivated in one click', () => {
    setup('active', { isBoosted: false })
    fireEvent.click(screen.getByRole('button', { name: /Desactivar/ }))
    expect(screen.queryByText('¿Desactivar esta publicación?')).toBeNull()
    expect(toggleMutate).toHaveBeenCalledWith({ listingId: 'L1', currentStatus: 'active' })
  })
})
