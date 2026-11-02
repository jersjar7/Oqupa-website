// @vitest-environment jsdom
// Rechazar used to decline at one tap, and a decline is permanent: the server
// then refuses the agent for that listing forever. The app asks first, with
// these words; the website now does too, and confirms Aceptar like the app
// (audit 2026-11-02, top item 15).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('@/app/components/ui', () => ({
  Button: ({ children, onClick, isLoading: _l, variant: _v, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean; variant?: string }) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
  PhotoCarousel: () => null,
  PhotoOverlayBadge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import AgentAssignmentCard from '../AgentAssignmentCard'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'

function setup() {
  const onAccept = vi.fn()
  const onDecline = vi.fn()
  const listing = {
    id: 'L1', assignmentStatus: 'pending_acceptance', viewCount: 0,
    price: { amount: 100, currency: 'PEN' }, description: '',
  } as unknown as Listing
  const property = {
    operationType: 'venta', propertyType: 'casa', location: { distrito: 'Castilla' },
    media: { photoKeys: [] },
  } as unknown as Property
  render(<AgentAssignmentCard listing={listing} property={property} onAccept={onAccept} onDecline={onDecline} />)
  return { onAccept, onDecline }
}

describe('AgentAssignmentCard — invitations ask first', () => {
  it('Rechazar asks, with the app words, before declining', () => {
    const { onDecline } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))
    expect(onDecline).not.toHaveBeenCalled()
    expect(screen.getByText(/No podrás ser reasignado a esta propiedad/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sí, rechazar' }))
    expect(onDecline).toHaveBeenCalledTimes(1)
  })

  it('Cancelar keeps the invitation', () => {
    const { onDecline } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onDecline).not.toHaveBeenCalled()
    expect(screen.queryByText(/No podrás ser reasignado/)).toBeNull()
  })

  it('Aceptar says the WhatsApp number becomes the contact before accepting', () => {
    const { onAccept } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
    expect(onAccept).not.toHaveBeenCalled()
    expect(screen.getByText(/Tu número de WhatsApp aparecerá como contacto principal de este anuncio/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Sí, aceptar' }))
    expect(onAccept).toHaveBeenCalledTimes(1)
  })
})
