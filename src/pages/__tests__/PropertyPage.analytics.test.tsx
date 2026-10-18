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

const {
  listingViewedMock,
  contactRevealedMock,
  contactTappedMock,
  contactGateStepMock,
  contactRevealFailedMock,
  getListingContactMock,
  mockAuth,
} = vi.hoisted(() => ({
  listingViewedMock: vi.fn(),
  contactRevealedMock: vi.fn(),
  contactTappedMock: vi.fn(),
  contactGateStepMock: vi.fn(),
  contactRevealFailedMock: vi.fn(),
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
    AnalyticsLogger: {
      listingViewed: listingViewedMock,
      contactRevealed: contactRevealedMock,
      contactTapped: contactTappedMock,
      contactGateStep: contactGateStepMock,
      contactRevealFailed: contactRevealFailedMock,
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

function renderPage(entry = `/property/${LISTING_ID}`) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
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
  contactTappedMock.mockReset()
  contactGateStepMock.mockReset()
  contactRevealFailedMock.mockReset()
  getListingContactMock.mockReset()
  localStorage.clear()
  sessionStorage.clear()
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

// ── The contact sign-up funnel (metrics plan A10) ─────────────────────────────

/** A refusal as the real service throws it: the reason plus the raw code. */
function denied(reason: string, code: string) {
  return Object.assign(new ContactDenied(reason as never), { code })
}

const CONTACT_OK = { phone: '+51 900 000 000', displayName: 'Ana', contactRole: 'owner', counted: true }

async function settle() {
  await waitFor(() => expect(getListingContactMock).toHaveBeenCalled())
  await waitFor(() => expect(screen.getByRole('button', { name: /whatsapp/i })).not.toHaveProperty('disabled', true))
}

function stepsLogged() {
  return contactGateStepMock.mock.calls.map((c) => c[0])
}

describe('contact_tapped', () => {
  it('records a verified person tapping', async () => {
    getListingContactMock.mockResolvedValue(CONTACT_OK)
    renderPage()
    clickWhatsApp()
    await waitFor(() => expect(window.open).toHaveBeenCalled())
    expect(contactTappedMock).toHaveBeenCalledTimes(1)
    expect(contactTappedMock).toHaveBeenCalledWith(LISTING_ID, 'verified')
  })

  it('records a guest tapping', async () => {
    mockAuth.firebaseUser = null
    mockAuth.user = null
    getListingContactMock.mockRejectedValue(denied('needs-login', 'unauthenticated'))
    renderPage()
    clickWhatsApp()
    await settle()
    expect(contactTappedMock).toHaveBeenCalledWith(LISTING_ID, 'guest')
  })

  it('records a signed-in person without a verified email as unverified', async () => {
    mockAuth.firebaseUser = { emailVerified: false }
    getListingContactMock.mockRejectedValue(denied('needs-email-verification', 'permission-denied'))
    renderPage()
    clickWhatsApp()
    await settle()
    expect(contactTappedMock).toHaveBeenCalledWith(LISTING_ID, 'unverified')
  })
})

describe('contact_reveal_failed', () => {
  it('records the raw server code of a refusal', async () => {
    getListingContactMock.mockRejectedValue(denied('rate-limited', 'resource-exhausted'))
    renderPage()
    clickWhatsApp()
    await settle()
    expect(contactRevealFailedMock).toHaveBeenCalledTimes(1)
    expect(contactRevealFailedMock).toHaveBeenCalledWith(LISTING_ID, 'resource-exhausted')
  })

  it('records "unknown" for a failure that is not a refusal', async () => {
    getListingContactMock.mockRejectedValue(new Error('offline'))
    renderPage()
    clickWhatsApp()
    await settle()
    expect(contactRevealFailedMock).toHaveBeenCalledWith(LISTING_ID, 'unknown')
  })

  it('is not recorded on success', async () => {
    getListingContactMock.mockResolvedValue(CONTACT_OK)
    renderPage()
    clickWhatsApp()
    await waitFor(() => expect(window.open).toHaveBeenCalled())
    expect(contactRevealFailedMock).not.toHaveBeenCalled()
  })
})

describe('contact_gate_step on the gate', () => {
  async function openGuestGate() {
    mockAuth.firebaseUser = null
    mockAuth.user = null
    getListingContactMock.mockRejectedValue(denied('needs-login', 'unauthenticated'))
    renderPage()
    clickWhatsApp()
    await screen.findByText('CREA TU CUENTA')
  }

  it('records the gate opening', async () => {
    await openGuestGate()
    expect(stepsLogged()).toEqual(['gate_shown'])
  })

  it('records CREA TU CUENTA', async () => {
    await openGuestGate()
    fireEvent.click(screen.getByText('CREA TU CUENTA'))
    expect(stepsLogged()).toEqual(['gate_shown', 'gate_create_account'])
  })

  it('records Ya tengo cuenta', async () => {
    await openGuestGate()
    fireEvent.click(screen.getByText('Ya tengo cuenta'))
    expect(stepsLogged()).toEqual(['gate_shown', 'gate_have_account'])
  })

  it('records Ahora no', async () => {
    await openGuestGate()
    fireEvent.click(screen.getByText('Ahora no'))
    expect(stepsLogged()).toEqual(['gate_shown', 'gate_dismissed'])
  })

  it('records a tap outside the gate as dismissed', async () => {
    await openGuestGate()
    const backdrop = screen.getByText('CREA TU CUENTA').closest('.fixed') as HTMLElement
    fireEvent.click(backdrop)
    expect(stepsLogged()).toEqual(['gate_shown', 'gate_dismissed'])
  })

  it('records VERIFICAR NÚMERO for a signed-in person', async () => {
    mockAuth.user = { id: 'viewer', isPhoneVerified: false }
    getListingContactMock.mockRejectedValue(denied('needs-phone-reverification', 'aborted'))
    renderPage()
    clickWhatsApp()
    fireEvent.click(await screen.findByText('VERIFICAR NÚMERO'))
    expect(stepsLogged()).toEqual(['gate_shown', 'gate_verify'])
  })
})

describe('back on the listing after the pipeline (#contactar)', () => {
  it('records "returned", not a tap, and the reveal', async () => {
    getListingContactMock.mockResolvedValue(CONTACT_OK)
    renderPage(`/property/${LISTING_ID}#contactar`)
    await waitFor(() => expect(contactRevealedMock).toHaveBeenCalled())
    expect(stepsLogged()).toEqual(['returned'])
    expect(contactTappedMock).not.toHaveBeenCalled()
  })

  it('records a refusal of the automatic retry, still without a tap', async () => {
    getListingContactMock.mockRejectedValue(denied('needs-email-verification', 'permission-denied'))
    renderPage(`/property/${LISTING_ID}#contactar`)
    await waitFor(() => expect(contactRevealFailedMock).toHaveBeenCalledWith(LISTING_ID, 'permission-denied'))
    expect(contactTappedMock).not.toHaveBeenCalled()
  })
})
