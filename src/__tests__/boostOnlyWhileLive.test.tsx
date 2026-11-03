// @vitest-environment jsdom
// A listing reads as boosted only while BOTH are true: isBoosted, and a
// boostedUntil still in the future.
//
// Measured on production 2026-11-02: after a refund the listing had
// isBoosted false and boostScore 1, but boostedUntil still in the future
// (2026-12-03). And between a boost's end and the hourly expiry job the
// opposite holds: isBoosted still true, boostedUntil already past. Neither may
// show a Destacado badge, a gold pin, or first place in the list — on any
// screen.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { mapListing } from '@/lib/map/__tests__/mapListingFixture'
import { sortListingsForList } from '@/lib/map/listLogic'
import { MapMarkerIndex } from '@/lib/map/mapMarkers'
import { createPinElement, createDotElement, createRaisedPinElement } from '@/components/explore/mapbox/pinElements'
import CompactListingCard from '@/components/explore/CompactListingCard'
import ListingListCard from '@/components/explore/list/ListingListCard'
import PropertyCard from '@/components/explore/PropertyCard'
import BoostStatusBadge from '@/app/features/boost/components/BoostStatusBadge'
import { isBoostLive } from '@/lib/boostState'

vi.mock('@/components/lists/SaveButton', () => ({ default: () => null }))

const DAY = 24 * 60 * 60 * 1000
const future = () => new Date(Date.now() + 31 * DAY)
const past = () => new Date(Date.now() - 2 * 60 * 60 * 1000)

/** After a refund (the production shape). */
const refunded = (id = 'refunded') => mapListing({ id, boosted: false, boostScore: 1, boostedUntil: future() })
/** Boost ended, the hourly job has not run yet. */
const expired = (id = 'expired') => mapListing({ id, boosted: true, boostScore: 100, boostedUntil: past() })
const live = (id = 'live') => mapListing({ id, boosted: true, boostScore: 100, boostedUntil: future() })

const GOLD = 'rgb(245, 158, 11)'

const SHAPES = [
  ['refunded (isBoosted false, boostedUntil in the future)', refunded],
  ['expired (isBoosted true, boostedUntil past)', expired],
] as const

describe('isBoostLive — the one rule', () => {
  it('live only with isBoosted AND a future boostedUntil', () => {
    expect(isBoostLive(live().listing)).toBe(true)
    expect(isBoostLive(refunded().listing)).toBe(false)
    expect(isBoostLive(expired().listing)).toBe(false)
    expect(isBoostLive(mapListing({ boosted: true, boostedUntil: null }).listing)).toBe(false)
  })
})

describe.each(SHAPES)('%s', (_name, make) => {
  it('list (Recomendados): not sorted first', () => {
    const older = mapListing({ id: 'plain', publishedAt: new Date('2026-10-20T00:00:00Z') })
    const shape = { ...make(), listing: { ...make().listing, publishedAt: new Date('2026-09-01T00:00:00Z') } }
    const out = sortListingsForList([shape, older], 'recomendados', 1, 3.7)
    expect(out.map((i) => i.listing.id)).toEqual(['plain', shape.listing.id])
  })

  it('map: not drawn as a boosted pin (it joins the others at its point)', () => {
    const metro = { south: -5.35, west: -80.8, north: -5.05, east: -80.5 }
    const out = new MapMarkerIndex([mapListing({ id: 'a', exact: false }), { ...make(), listing: { ...make().listing, showExactLocation: false, displayLatitude: -5.1945, displayLongitude: -80.6328 } }])
      .markersFor(metro, 15, null)
    expect(out).toHaveLength(1)
    expect(out[0]!.kind).toBe('group')
  })

  it('map pin: no sparkle', () => {
    expect(createPinElement(make(), { selected: false }).textContent).not.toContain('✦')
  })

  it('map dot: no gold edge', () => {
    const dot = createDotElement(make(), () => {}).querySelector<HTMLElement>('button')!
    expect(dot.style.borderColor).not.toBe(GOLD)
  })

  it('raised pin: not gold', () => {
    const el = createRaisedPinElement(make(), vi.fn())
    expect(el.textContent).not.toContain('✦')
    expect(el.querySelector<HTMLElement>('[data-role="pill"]')?.style.borderColor ?? '').not.toBe(GOLD)
  })

  it('compact card (map): no DESTACADO', () => {
    render(<CompactListingCard item={make()} />)
    expect(screen.queryByText(/destacado/i)).toBeNull()
  })

  it('list card: no DESTACADO, no gold border', () => {
    render(<MemoryRouter><ListingListCard item={make()} /></MemoryRouter>)
    expect(screen.queryByText(/destacado/i)).toBeNull()
    expect(screen.getByTestId('listing-list-card').className).not.toMatch(/border-boost/)
  })

  it('property card: no DESTACADO', () => {
    render(<MemoryRouter><PropertyCard item={make()} /></MemoryRouter>)
    expect(screen.queryByText(/destacado/i)).toBeNull()
  })

  it('owner badge: no "DESTACADO · N días"', () => {
    const { container } = render(<BoostStatusBadge listing={make().listing} detailed />)
    expect(container.textContent).toBe('')
  })
})

describe('control: a live boost still shows everywhere', () => {
  it('first in the list, gold on the map, badge on the cards', () => {
    const out = sortListingsForList([mapListing({ id: 'plain', publishedAt: new Date() }), live()], 'recomendados', 1, 3.7)
    expect(out[0]!.listing.id).toBe('live')
    expect(createDotElement(live(), () => {}).querySelector<HTMLElement>('button')!.style.borderColor).toBe(GOLD)
    render(<BoostStatusBadge listing={live().listing} detailed />)
    expect(screen.getByText(/destacado/i)).toBeDefined()
  })
})
