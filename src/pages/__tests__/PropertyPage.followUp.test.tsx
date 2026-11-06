// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

/**
 * The WhatsApp hand-off tells the A11b follow-up card what is happening, as
 * the app's action_buttons_section does: hold off while the number is being
 * fetched, and ask on the next return once WhatsApp was opened — the server
 * records the contact before the number comes back.
 */

const { getListingContactMock, mockAuth, followUps, order } = vi.hoisted(() => {
  const order: string[] = []
  return {
    order,
    getListingContactMock: vi.fn(),
    mockAuth: { firebaseUser: null as unknown, user: null as unknown },
    followUps: {
      contactStarted: vi.fn(() => { order.push('started') }),
      contactHandedOff: vi.fn(() => { order.push('handedOff') }),
      contactEndedWithoutHandOff: vi.fn(() => { order.push('ended') }),
    },
  }
})

const mockProperty = {
  listing: null as unknown,
  property: null as unknown,
  isLoading: false,
  error: null as unknown,
}

vi.mock('@/hooks/useProperty', () => ({ useProperty: () => mockProperty }))
vi.mock('@/hooks/useListingCounts', () => ({ useCountSeenWhileOpen: () => {}, useCountShownWhenVisible: () => () => {} }))
vi.mock('@/hooks/useListingApariciones', () => ({ useListingsApariciones: () => ({ byId: {}, total: undefined, isLoading: false, isError: false }) }))
vi.mock('@/hooks/useDocumentMeta', () => ({ useDocumentMeta: () => {} }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => mockAuth }))
vi.mock('@/lib/contactFollowUpCoordinator', () => ({ contactFollowUpCoordinator: followUps }))
vi.mock('@/lib/analytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/analytics')>()
  return {
    priceBandFor: actual.priceBandFor,
    AnalyticsLogger: {
      listingViewed: vi.fn(),
      contactRevealed: vi.fn(),
      contactTapped: vi.fn(),
      contactGateStep: vi.fn(),
      contactRevealFailed: vi.fn(),
    },
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

const LISTING = {
  id: 'listing_1',
  ownerId: 'someone-else',
  description: 'Departamento en Castilla',
  price: { amount: 1200, currency: 'USD' },
  operationType: 'alquiler',
  status: 'active',
  viewCount: 3,
  showExactLocation: false,
  media: { photoKeys: [] },
}

const PROPERTY = {
  propertyType: 'departamento',
  operationType: 'alquiler',
  specs: { totalAreaInSquareMeters: 120, bedroomCount: 3, bathroomCount: 2, propertyAmenities: [] },
  location: { distrito: 'Castilla', provincia: 'Piura', departamento: 'Piura', calle: '', urbanizacion: '' },
  media: { photoKeys: [] },
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/property/listing_1']}>
      <Routes>
        <Route path="/property/:id" element={<PropertyPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const clickWhatsApp = () => fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }))

beforeEach(() => {
  getListingContactMock.mockReset()
  for (const fn of Object.values(followUps)) fn.mockClear()
  order.length = 0
  localStorage.clear()
  sessionStorage.clear()
  mockProperty.listing = LISTING
  mockProperty.property = PROPERTY
  mockAuth.firebaseUser = { emailVerified: true }
  mockAuth.user = { id: 'viewer', name: 'Ana', isPhoneVerified: true }
  vi.spyOn(window, 'open').mockImplementation(() => {
    order.push('open')
    return null
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('WhatsApp hand-off → follow-up card', () => {
  it('started, then handed off BEFORE WhatsApp opens, and never "ended"', async () => {
    getListingContactMock.mockResolvedValue({ phone: '+51 999 888 777' })
    renderPage()
    clickWhatsApp()
    await waitFor(() => expect(window.open).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByRole('button', { name: /whatsapp/i })).not.toHaveProperty('disabled', true))
    expect(order).toEqual(['started', 'handedOff', 'open'])
  })

  it('a refusal ends the contact without a hand-off', async () => {
    getListingContactMock.mockRejectedValue(new ContactDenied('rate-limited' as never))
    renderPage()
    clickWhatsApp()
    await waitFor(() => expect(followUps.contactEndedWithoutHandOff).toHaveBeenCalledTimes(1))
    expect(followUps.contactHandedOff).not.toHaveBeenCalled()
    expect(order).toEqual(['started', 'ended'])
  })

  it('the account gate opening ends it too', async () => {
    getListingContactMock.mockRejectedValue(new ContactDenied('needs-phone-verification' as never))
    renderPage()
    clickWhatsApp()
    await waitFor(() => expect(followUps.contactEndedWithoutHandOff).toHaveBeenCalledTimes(1))
    expect(followUps.contactHandedOff).not.toHaveBeenCalled()
  })

  it('the account gate is marked as a dialog, so the card never lands over it', async () => {
    getListingContactMock.mockRejectedValue(new ContactDenied('needs-phone-verification' as never))
    renderPage()
    clickWhatsApp()
    await waitFor(() => expect(document.querySelector('[role="dialog"][aria-modal="true"]')).toBeTruthy())
  })
})
