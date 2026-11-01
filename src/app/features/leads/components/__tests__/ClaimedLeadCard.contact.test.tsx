// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * An agent opening the owner's WhatsApp from a claimed lead. Since
 * 2026-10-31 the server refuses a listing that is no longer active; the card
 * must say so, not suggest something went wrong and to try again.
 */

const { getListingContactMock, toastError } = vi.hoisted(() => ({
  getListingContactMock: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('@/services/contactService', () => ({
  contactService: { getListingContact: getListingContactMock },
  ContactDenied: class ContactDenied extends Error {
    constructor(public reason: string) {
      super(reason)
    }
  },
}))
vi.mock('sonner', () => ({ toast: { error: toastError, success: vi.fn() } }))
vi.mock('@/app/components/ui', () => ({
  PhotoCarousel: () => null,
  PhotoOverlayBadge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Button: ({ children, onClick, isLoading: _l, variant: _v, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean; variant?: string }) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
}))
vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import ClaimedLeadCard from '../ClaimedLeadCard'
import { ContactDenied } from '@/services/contactService'

function setup() {
  const claim = { id: 'c1', claimedAt: new Date() } as never
  const listing = {
    id: 'L1', price: { amount: 100, currency: 'PEN' }, description: 'Casa', status: 'active',
  } as never
  const property = {
    operationType: 'venta', propertyType: 'casa',
    location: { distrito: 'Castilla', provincia: 'Piura' },
    specs: { totalAreaInSquareMeters: 100 }, media: { photoKeys: [] },
  } as never
  render(<ClaimedLeadCard claim={claim} listing={listing} property={property} />)
}

describe('ClaimedLeadCard — contacting the owner', () => {
  beforeEach(() => vi.clearAllMocks())

  it('a listing no longer up: says so plainly', async () => {
    getListingContactMock.mockRejectedValue(new ContactDenied('listing-not-available' as never))
    setup()
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Esta publicación ya no está disponible.'))
  })

  it('any other failure keeps the general message', async () => {
    getListingContactMock.mockRejectedValue(new Error('offline'))
    setup()
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }))
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('No se pudo obtener el contacto del propietario.'))
  })
})
