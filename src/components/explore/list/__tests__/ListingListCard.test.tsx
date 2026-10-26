// @vitest-environment jsdom
// The type drawing on a list card sits on a white card, so nothing in it may
// be drawn in white (2026-10-26: the land drawing's plot and flag pole were
// white strokes — on oqupa.com only the flag showed).
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ListingListCard from '../ListingListCard'
import { mapListing } from '@/lib/map/__tests__/mapListingFixture'
import type { PropertyType } from '@/types/enums'

vi.mock('@/components/lists/SaveButton', () => ({ default: () => null }))

const TYPES: PropertyType[] = ['casa', 'departamento', 'terreno', 'local', 'oficina']

describe('ListingListCard type drawing', () => {
  // White fills are the cut-outs (windows, doors) inside a coloured shape and
  // are meant; a white OUTLINE has nothing coloured behind it and vanishes.
  it.each(TYPES)('%s: no white outlines on the white card', (type) => {
    const { container } = render(
      <MemoryRouter>
        <ListingListCard item={mapListing({ type })} />
      </MemoryRouter>,
    )
    const svg = container.querySelector('[data-role="type-word"] svg')
    expect(svg).not.toBeNull()
    const white = Array.from(svg!.querySelectorAll('*')).filter((el) =>
      (el.getAttribute('stroke') ?? '').toLowerCase() === '#fff',
    )
    expect(white).toHaveLength(0)
  })
})
