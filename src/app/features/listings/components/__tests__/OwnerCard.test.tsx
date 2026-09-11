// @vitest-environment jsdom
// The "Publicado por" card on the public property page.
//
// It reads ONLY the four values that ADR-015 Phase 3.3 copied onto the listing
// document (stamped at creation by the server since 2026-08-26). It must never
// need the owner's user record — that record is private as of B6, and a
// logged-out visitor could not read it anyway.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OwnerCard, ownerCardFor } from '../OwnerCard'
import type { Listing } from '@/types/listing'

const base = {
  ownerDisplayName: 'Ana Torres',
  ownerPhotoKey: 'user-photos/u1/1.webp',
  ownerIsVerified: true,
  ownerMemberSinceYear: 2026,
} as Partial<Listing>

describe('ownerCardFor', () => {
  it('uses the values stamped on the listing, never a user record', () => {
    expect(ownerCardFor(base as Listing)).toEqual({
      name: 'Ana Torres',
      photoKey: 'user-photos/u1/1.webp',
      isVerified: true,
      memberSinceYear: 2026,
    })
  })

  it('falls back to "Propietario" when the listing was never stamped', () => {
    expect(ownerCardFor({} as Listing)).toEqual({
      name: 'Propietario',
      photoKey: null,
      isVerified: false,
      memberSinceYear: null,
    })
  })

  it('is hidden while an agent represents the listing — the owner is not the contact then', () => {
    // No agent identity is denormalised yet; showing the owner's card next to
    // an agent's WhatsApp would name the wrong person.
    expect(ownerCardFor({ ...base, assignmentStatus: 'accepted', assignedRealtorId: 'r1' } as Listing)).toBeNull()
    expect(ownerCardFor({ ...base, assignmentStatus: 'pending_acceptance', assignedRealtorId: 'r1' } as Listing)).not.toBeNull()
  })
})

describe('<OwnerCard />', () => {
  it('shows the name, the verified badge and the member-since year', () => {
    render(<OwnerCard listing={base as Listing} />)
    expect(screen.getByText('Ana Torres')).toBeTruthy()
    expect(screen.getByLabelText('Verificado')).toBeTruthy()
    expect(screen.getByText(/Miembro desde 2026/)).toBeTruthy()
    expect(screen.getByText(/Propietario/)).toBeTruthy()
  })

  it('shows no badge and no year when the owner is unverified and the year is unknown', () => {
    render(<OwnerCard listing={{ ...base, ownerIsVerified: false, ownerMemberSinceYear: undefined } as Listing} />)
    expect(screen.queryByLabelText('Verificado')).toBeNull()
    expect(screen.queryByText(/Miembro desde/)).toBeNull()
  })

  it('renders nothing when an agent has accepted the listing', () => {
    const { container } = render(
      <OwnerCard listing={{ ...base, assignmentStatus: 'accepted', assignedRealtorId: 'r1' } as Listing} />,
    )
    expect(container.innerHTML).toBe('')
  })
})
