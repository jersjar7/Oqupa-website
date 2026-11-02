// @vitest-environment jsdom
// The card used to say "baños" whatever the count; a stored 0 read "0 baños"
// (coordinator, 2026-11-02 — match the app).
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PropertyCard from '../PropertyCard'
import { mapListing } from '@/lib/map/__tests__/mapListingFixture'

vi.mock('@/components/lists/SaveButton', () => ({ default: () => null }))

const renderCard = (bathrooms: number) =>
  render(<MemoryRouter><PropertyCard item={mapListing({ bedrooms: 2, bathrooms })} /></MemoryRouter>)

describe('PropertyCard room counts', () => {
  it('1 baño, singular', () => {
    renderCard(1)
    expect(document.body.textContent).toMatch(/1 baño(?!s)/)
  })
  it('2 baños, plural', () => {
    renderCard(2)
    expect(document.body.textContent).toContain('2 baños')
  })
  it('a stored 0 is not shown', () => {
    renderCard(0)
    expect(document.body.textContent).not.toMatch(/baño/)
  })
})
