// @vitest-environment jsdom
// Jerson, 2026-10-25: "Filters should appear above any card." The hover card
// used to be moved to the end of the page with a z-index of 9999, which put
// it above the filter bar and its open panel. It now stays inside the explore
// page, below the filters.
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HoverPreviewCard from '../HoverPreviewCard'
import { MAP_CARD_Z, MAP_FILTERS_Z } from '@/lib/map/mapView'
import { mapListing } from '@/lib/map/__tests__/mapListingFixture'

vi.mock('@/components/lists/SaveButton', () => ({ default: () => null }))

describe('HoverPreviewCard', () => {
  it('stays inside the page, below the filters', () => {
    const marker = document.createElement('div')
    marker.dataset.markerId = 'L1'
    document.body.append(marker)
    const { container } = render(
      <MemoryRouter>
        <div data-testid="page"><HoverPreviewCard item={mapListing({ id: 'L1' })} onHover={() => {}} /></div>
      </MemoryRouter>,
    )
    const card = container.querySelector<HTMLElement>('[aria-label="Ver detalles de la propiedad"]')
    expect(card).not.toBeNull()
    expect(Number(card!.style.zIndex)).toBe(MAP_CARD_Z)
    expect(Number(card!.style.zIndex)).toBeLessThan(MAP_FILTERS_Z)
  })
})
