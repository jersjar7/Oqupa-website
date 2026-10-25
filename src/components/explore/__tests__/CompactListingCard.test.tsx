// @vitest-environment jsdom
// The slim listing card (UX review 2026-10-25, Jerson: "use at most the screen
// real estate and be simple and modern"): a small photo on the left, the
// price, type, details and place on the right — the same card on a phone (at
// the bottom) and on a computer (on the map). Prices are written the way the
// pins and the list write them ("US$ 98 mil"), never "98,000".
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CompactListingCard, { COMPACT_CARD_PHOTO_PX } from '../CompactListingCard'
import { mapListing } from '@/lib/map/__tests__/mapListingFixture'

vi.mock('@/components/lists/SaveButton', () => ({ default: () => null }))

describe('CompactListingCard', () => {
  it('price as on the pin, type word, details and place', () => {
    render(<CompactListingCard item={mapListing({ amount: 98000, currency: 'USD', distrito: 'Castilla' })} />)
    expect(screen.getByText('US$ 98 mil')).toBeDefined()
    expect(screen.getByText('CASA')).toBeDefined()
    expect(document.body.textContent).toMatch(/Castilla/)
    expect(document.body.textContent).not.toMatch(/98,000|98\.000/)
  })
  it('rent shows its period, like the pin', () => {
    render(<CompactListingCard item={mapListing({ operation: 'alquiler', amount: 1200, currency: 'PEN', type: 'departamento' })} />)
    expect(screen.getByText('S/. 1,200 al mes')).toBeDefined()
  })
  it('one small photo on the left, no carousel and no button', () => {
    render(<CompactListingCard item={mapListing({ photos: 3 })} />)
    const imgs = document.querySelectorAll('img')
    expect(imgs).toHaveLength(1)
    expect((imgs[0]!.parentElement as HTMLElement).style.width).toBe(`${COMPACT_CARD_PHOTO_PX}px`)
    expect(screen.queryByRole('button', { name: /ver detalles/i })).toBeNull()
  })
  it('a boosted listing says so', () => {
    render(<CompactListingCard item={mapListing({ boosted: true, photos: 1 })} />)
    expect(screen.getByText(/destacado/i)).toBeDefined()
  })

  // Jerson, 2026-10-25: older people may think the card is all there is. A
  // wordless arrow says "there is more" — "I believe well designed UI/UX does
  // not need text explaining it."
  it('a small arrow on the right says there is more — and no words do', () => {
    render(<CompactListingCard item={mapListing({ amount: 98000, currency: 'USD' })} />)
    expect(document.querySelector('[data-role="more-arrow"]')).not.toBeNull()
    expect(document.body.textContent).not.toMatch(/ver más|toca|click|detalles/i)
  })
})
