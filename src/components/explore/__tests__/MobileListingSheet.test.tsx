// @vitest-environment jsdom
// The phone's listing card at the bottom of the map (UX review 2026-10-25): the
// slim card instead of a half-screen photo and a VER DETALLES button. The whole
// card opens the listing. No dark layer over the map, so the map stays usable:
// tapping another pin opens that one, tapping the map closes the card.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import MobileListingSheet from '../MobileListingSheet'
import { mapListing } from '@/lib/map/__tests__/mapListingFixture'

vi.mock('@/components/lists/SaveButton', () => ({ default: () => null }))

function renderSheet(item = mapListing({ id: 'L1', amount: 98000, currency: 'USD' })) {
  return render(
    <MemoryRouter initialEntries={['/explorar']}>
      <Routes>
        <Route path="/explorar" element={<MobileListingSheet item={item} onClose={() => {}} />} />
        <Route path="/property/:id" element={<p>página de la propiedad</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MobileListingSheet', () => {
  it('shows the slim card, with no VER DETALLES button', () => {
    renderSheet()
    expect(screen.getByText('US$ 98 mil')).toBeDefined()
    expect(screen.queryByText(/ver detalles/i)).toBeNull()
  })
  it('tapping anywhere on the card opens the listing', () => {
    renderSheet()
    fireEvent.click(screen.getByText('US$ 98 mil'))
    expect(screen.getByText('página de la propiedad')).toBeDefined()
  })
  it('no dark layer over the map', () => {
    renderSheet()
    expect(document.querySelector('.bg-black\\/40')).toBeNull()
    expect(screen.getByRole('dialog').getAttribute('aria-modal')).toBeNull()
  })
})
