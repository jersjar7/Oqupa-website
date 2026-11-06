// @vitest-environment jsdom
// ADR-051: where the website counts. A list card counts Apariciones; the
// selected pin's card (phone sheet, computer pop-up) counts Apariciones and
// Vistas; the listing's own page counts Vistas. The hover preview on a
// computer does not count: on the app there is no hover, and both must count
// the same way.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { mapListing } from '@/lib/map/__tests__/mapListingFixture'

const shown = vi.fn((..._a: unknown[]) => () => {})
const seen = vi.fn((..._a: unknown[]) => {})
vi.mock('@/hooks/useListingCounts', () => ({
  useCountShownWhenVisible: (...a: unknown[]) => shown(...a),
  useCountSeenWhileOpen: (...a: unknown[]) => seen(...a),
}))
vi.mock('@/components/lists/SaveButton', () => ({ default: () => null }))

const { default: ListingListCard } = await import('@/components/explore/list/ListingListCard')
const { default: MobileListingSheet } = await import('@/components/explore/MobileListingSheet')

beforeEach(() => {
  shown.mockClear()
  seen.mockClear()
})

describe('where the website counts', () => {
  it('a list card counts Apariciones for its listing, never Vistas', () => {
    const item = mapListing({ id: 'L1' })
    render(<MemoryRouter><ListingListCard item={item} /></MemoryRouter>)
    expect(shown).toHaveBeenCalledWith('L1', item.listing.ownerId)
    expect(seen).not.toHaveBeenCalled()
  })

  it('the selected pin\'s card on a phone counts Apariciones and Vistas', () => {
    const item = mapListing({ id: 'L2' })
    render(<MemoryRouter><MobileListingSheet item={item} onClose={() => {}} /></MemoryRouter>)
    expect(shown).toHaveBeenCalledWith('L2', item.listing.ownerId)
    expect(seen).toHaveBeenCalledWith('L2', item.listing.ownerId)
  })

  const src = (p: string) => readFileSync(resolve(__dirname, '..', p), 'utf8')

  it('the selected pin\'s card on a computer goes through the same counted card', () => {
    const map = src('components/explore/ExploreMap.tsx')
    expect(map).toMatch(/<CountedSelectedCard item=\{selectedItem\}>/)
  })

  it('the hover preview is not counted', () => {
    expect(src('components/explore/HoverPreviewCard.tsx')).not.toMatch(/useCount|CountedSelectedCard/)
  })

  it('the listing page counts a Vista once its owner is known, and no longer uses the old counter', () => {
    const page = src('pages/PropertyPage.tsx')
    expect(page).toMatch(/useCountSeenWhileOpen\(id, listing\?\.ownerId\)/)
    expect(page).not.toMatch(/useRecordListingView/)
  })
  it('Mis propiedades passes each card its Apariciones', () => {
    const page = src('app/features/listings/pages/ListingsPage.tsx')
    expect(page).toMatch(/apariciones=\{apariciones\.byId\[listing\.id\]\}/)
  })
})
