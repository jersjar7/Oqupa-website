// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * The property page must survive the loading -> loaded transition.
 *
 * On 2026-08-04 every property page on oqupa.com showed "Algo salió mal".
 * `contactLoading` had been declared with `useState` BELOW the `isLoading` and
 * `not found` early returns, where it replaced a plain `const` in ADR-015
 * Phase 3.4. The first render returned early and never reached it; the second
 * render did. React saw the hook count grow and threw #310.
 *
 * The fault exists ONLY across that transition — rendering either state alone
 * passes, which is why the whole suite stayed green while the live page was
 * dead. So this test renders loading first, then re-renders loaded through the
 * SAME component instance, which is the only arrangement that catches it.
 *
 * Sabotage check: move the `contactLoading` useState back below the early
 * returns and this test fails.
 */

const mockProperty = {
  listing: null as unknown,
  property: null as unknown,
  isLoading: true,
  error: null as unknown,
}

vi.mock('@/hooks/useProperty', () => ({ useProperty: () => mockProperty }))
vi.mock('@/hooks/useRecordListingView', () => ({ useRecordListingView: () => ({ record: vi.fn() }) }))
vi.mock('@/hooks/useDocumentMeta', () => ({ useDocumentMeta: () => {} }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ firebaseUser: null, user: null }) }))
vi.mock('@/lib/analytics', () => ({ AnalyticsLogger: { listingViewed: vi.fn(), event: vi.fn() } }))
vi.mock('@/services/contactService', () => ({
  contactService: { getListingContact: vi.fn() },
  ContactDenied: class extends Error {},
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/components/lists/SaveButton', () => ({ default: () => null }))
vi.mock('@/app/features/boost/components/BoostPurchaseFlow', () => ({ default: () => null }))
vi.mock('@/components/ShareFormatModal', () => ({ default: () => null }))
vi.mock('@/app/components/GalleryModal', () => ({ default: () => null }))
vi.mock('@/components/AppStoreBadges', () => ({ default: () => null }))

import PropertyPage from '../PropertyPage'

const LISTING = {
  id: 'listing_1780636814054_t3614sj',
  ownerId: 'someone-else',
  description: 'Departamento en Castilla',
  price: { amount: 520000, currency: 'PEN' },
  operationType: 'venta',
  viewCount: 3,
  // The listing that actually crashed in production hides its exact address.
  showExactLocation: false,
  displayLatitude: -5.1759,
  displayLongitude: -80.6078,
  media: { photoKeys: [] },
}

const PROPERTY = {
  propertyType: 'departamento',
  operationType: 'venta',
  specs: { totalAreaInSquareMeters: 120, bedroomCount: 3, bathroomCount: 2, propertyAmenities: [] },
  location: { distrito: 'Castilla', provincia: 'Piura', departamento: 'Piura', calle: '', urbanizacion: '' },
  media: { photoKeys: [] },
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/property/listing_1780636814054_t3614sj']}>
      <PropertyPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  mockProperty.listing = null
  mockProperty.property = null
  mockProperty.isLoading = true
  mockProperty.error = null
})

describe('the loading -> loaded transition', () => {
  it('does not change its hook count when the data arrives', () => {
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => errors.push(a))

    const { rerender } = renderPage()
    expect(screen.getByText(/Cargando propiedad/i)).toBeTruthy()

    // Same component instance, now with data — the exact moment that broke.
    mockProperty.isLoading = false
    mockProperty.listing = LISTING
    mockProperty.property = PROPERTY
    rerender(
      <MemoryRouter initialEntries={['/property/listing_1780636814054_t3614sj']}>
        <PropertyPage />
      </MemoryRouter>,
    )

    const hookErrors = errors
      .flat()
      .map(String)
      .filter((m) => /rendered more hooks|rendered fewer hooks|Rules of Hooks|error #3(00|01|10)/i.test(m))

    expect(hookErrors).toEqual([])
    spy.mockRestore()
  })

  it('renders the listing once loaded rather than the error boundary', () => {
    const { rerender } = renderPage()
    mockProperty.isLoading = false
    mockProperty.listing = LISTING
    mockProperty.property = PROPERTY
    rerender(
      <MemoryRouter initialEntries={['/property/listing_1780636814054_t3614sj']}>
        <PropertyPage />
      </MemoryRouter>,
    )

    expect(screen.queryByText(/Cargando propiedad/i)).toBeNull()
    expect(screen.queryByText(/Propiedad no encontrada/i)).toBeNull()
    // The district appears in more than one place (heading, location line) —
    // any of them is proof the real page rendered instead of a fallback.
    expect(screen.getAllByText(/Castilla/i).length).toBeGreaterThan(0)
  })

  it('still shows the not-found state when the listing is missing', () => {
    mockProperty.isLoading = false
    mockProperty.listing = null
    mockProperty.property = null
    renderPage()
    expect(screen.getByText(/Propiedad no encontrada/i)).toBeTruthy()
  })
})
