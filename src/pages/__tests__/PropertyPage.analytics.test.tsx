// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

/**
 * listing_viewed and contact_revealed from the property page (metrics plan A3).
 *
 * The extras are Firebase-only segment params taken from the loaded listing
 * and property. The positional district that feeds Meta/TikTok must stay
 * exactly as before, and contact_revealed must count only reveals that
 * actually happened.
 */

const { listingViewedMock, contactRevealedMock, getListingContactMock, mockAuth } = vi.hoisted(() => ({
  listingViewedMock: vi.fn(),
  contactRevealedMock: vi.fn(),
  getListingContactMock: vi.fn(),
  mockAuth: { firebaseUser: null as unknown, user: null as unknown },
}))

const mockProperty = {
  listing: null as unknown,
  property: null as unknown,
  isLoading: false,
  error: null as unknown,
}

vi.mock('@/hooks/useProperty', () => ({ useProperty: () => mockProperty }))
vi.mock('@/hooks/useRecordListingView', () => ({ useRecordListingView: () => ({ record: vi.fn() }) }))
vi.mock('@/hooks/useDocumentMeta', () => ({ useDocumentMeta: () => {} }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => mockAuth }))
vi.mock('@/lib/analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/analytics')>()
  return {
    priceBandFor: actual.priceBandFor,
    AnalyticsLogger: { listingViewed: listingViewedMock, contactRevealed: contactRevealedMock },
  }
})
vi.mock('@/lib/firebase', () => ({ analytics: {} }))
vi.mock('@/services/contactService', () => ({
  contactService: { getListingContact: getListingContactMock },
  ContactDenied: class ContactDenied extends Error {
    constructor(public reason: string) {
      super(reason)
    }
  },
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/components/lists/SaveButton', () => ({ default: () => null }))
vi.mock('@/app/features/boost/components/BoostPurchaseFlow', () => ({ default: () => null }))
vi.mock('@/components/ShareFormatModal', () => ({ default: () => null }))
vi.mock('@/app/components/GalleryModal', () => ({ default: () => null }))
vi.mock('@/components/AppStoreBadges', () => ({ default: () => null }))

import PropertyPage from '../PropertyPage'
import { ContactDenied } from '@/services/contactService'

const LISTING_ID = 'listing_1'

const LISTING = {
  id: LISTING_ID,
  ownerId: 'someone-else',
  description: 'Departamento en Castilla',
  // The listing's own price and currency — not the property's.
  price: { amount: 1200, currency: 'USD' },
  operationType: 'alquiler',
  status: 'active',
  viewCount: 3,
  showExactLocation: false,
  media: { photoKeys: [] },
}

const PROPERTY = {
  propertyType: 'departamento',
  operationType: 'venta',
  price: { amount: 999999, currency: 'PEN' },
  specs: { totalAreaInSquareMeters: 120, bedroomCount: 3, bathroomCount: 2, propertyAmenities: [] },
  location: { distrito: 'Castilla', provincia: 'Piura', departamento: 'Piura', calle: 'Av. Secreta 123', urbanizacion: '' },
  media: { photoKeys: [] },
}

const EXPECTED_EXTRAS = {
  district: 'Castilla',
  propertyType: 'departamento',
  priceBand: '1000-1500',
  priceCurrency: 'USD',
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/property/${LISTING_ID}`]}>
      <Routes>
        <Route path="/property/:id" element={<PropertyPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function clickWhatsApp() {
  fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }))
}

beforeEach(() => {
  listingViewedMock.mockReset()
  contactRevealedMock.mockReset()
  getListingContactMock.mockReset()
  mockProperty.listing = LISTING
  mockProperty.property = PROPERTY
  mockProperty.isLoading = false
  mockProperty.error = null
  mockAuth.firebaseUser = { emailVerified: true }
  mockAuth.user = { id: 'viewer', isPhoneVerified: true }
  vi.spyOn(window, 'open').mockImplementation(() => null)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('listing_viewed', () => {
  it('fires once with the raw district for Meta/TikTok and the extras', () => {
    renderPage()
    expect(listingViewedMock).toHaveBeenCalledTimes(1)
    expect(listingViewedMock).toHaveBeenCalledWith(LISTING_ID, 'Castilla', {
      operationType: 'alquiler',
      ...EXPECTED_EXTRAS,
    })
  })

  it('does not fire while loading', () => {
    mockProperty.isLoading = true
    mockProperty.listing = null
    mockProperty.property = null
    renderPage()
    expect(listingViewedMock).not.toHaveBeenCalled()
  })

  it('does not fire when the listing is not found', () => {
    mockProperty.listing = null
    mockProperty.property = null
    renderPage()
    expect(listingViewedMock).not.toHaveBeenCalled()
  })

  it('never carries the street or the exact price', () => {
    renderPage()
    const sent = JSON.stringify(listingViewedMock.mock.calls)
    expect(sent).not.toContain('Secreta')
    expect(sent).not.toContain('1200')
  })
})

describe('contact_revealed', () => {
  it('fires once with the extras after a successful reveal', async () => {
    getListingContactMock.mockResolvedValue({ phone: '+51 999 888 777' })
    renderPage()
    clickWhatsApp()
    await waitFor(() => expect(window.open).toHaveBeenCalled())
    expect(contactRevealedMock).toHaveBeenCalledTimes(1)
    expect(contactRevealedMock).toHaveBeenCalledWith(LISTING_ID, EXPECTED_EXTRAS)
  })

  it('fires once per reveal', async () => {
    getListingContactMock.mockResolvedValue({ phone: '+51 999 888 777' })
    renderPage()
    clickWhatsApp()
    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByRole('button', { name: /whatsapp/i })).not.toHaveProperty('disabled', true))
    clickWhatsApp()
    await waitFor(() => expect(window.open).toHaveBeenCalledTimes(2))
    expect(contactRevealedMock).toHaveBeenCalledTimes(2)
  })

  it('does not fire when the server denies the contact', async () => {
    getListingContactMock.mockRejectedValue(new ContactDenied('rate-limited' as never))
    renderPage()
    clickWhatsApp()
    await waitFor(() => expect(getListingContactMock).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByRole('button', { name: /whatsapp/i })).not.toHaveProperty('disabled', true))
    expect(contactRevealedMock).not.toHaveBeenCalled()
  })

  it('does not fire on a network failure', async () => {
    getListingContactMock.mockRejectedValue(new Error('offline'))
    renderPage()
    clickWhatsApp()
    await waitFor(() => expect(getListingContactMock).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByRole('button', { name: /whatsapp/i })).not.toHaveProperty('disabled', true))
    expect(contactRevealedMock).not.toHaveBeenCalled()
  })
})
