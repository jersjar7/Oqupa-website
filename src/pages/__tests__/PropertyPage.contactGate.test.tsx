// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

/**
 * The contact window on a listing (2026-10-24).
 *
 * 1. "Verifica tu número otra vez" only when the person's own record says the
 *    number WAS verified. The server answers the same for anyone with no phone
 *    attached, and a brand-new person was told to verify "again" (Jerson, on
 *    staging).
 * 2. "Usar otra cuenta": the way out of a half-finished account on a phone,
 *    where the header hides "Salir". Signed-in only; signs out, keeps this
 *    listing as the errand, opens the sign-in door, and counts as a way out
 *    of the gate.
 */

const {
  listingViewedMock,
  contactRevealedMock,
  contactTappedMock,
  contactGateStepMock,
  contactRevealFailedMock,
  getListingContactMock,
  mockAuth,
  logoutMock,
} = vi.hoisted(() => ({
  listingViewedMock: vi.fn(),
  contactRevealedMock: vi.fn(),
  contactTappedMock: vi.fn(),
  contactGateStepMock: vi.fn(),
  contactRevealFailedMock: vi.fn(),
  getListingContactMock: vi.fn(),
  mockAuth: { firebaseUser: null as unknown, user: null as unknown },
  logoutMock: vi.fn(),
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
vi.mock('@/services/authService', () => ({ authService: { logout: logoutMock } }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/components/lists/SaveButton', () => ({ default: () => null }))
vi.mock('@/app/features/boost/components/BoostPurchaseFlow', () => ({ default: () => null }))
vi.mock('@/components/ShareFormatModal', () => ({ default: () => null }))
vi.mock('@/app/components/GalleryModal', () => ({ default: () => null }))
vi.mock('@/components/AppStoreBadges', () => ({ default: () => null }))

import PropertyPage from '../PropertyPage'
import { ContactDenied, type ContactDenialReason } from '@/services/contactService'
import { peekReturnUrl } from '@/lib/utils'

const LISTING = {
  id: 'listing_1', ownerId: 'someone-else', description: 'Casa',
  price: { amount: 1200, currency: 'USD' }, operationType: 'alquiler', status: 'active',
  viewCount: 3, showExactLocation: false, media: { photoKeys: [] },
}
const PROPERTY = {
  propertyType: 'casa', operationType: 'alquiler',
  specs: { totalAreaInSquareMeters: 120, bedroomCount: 3, bathroomCount: 2, propertyAmenities: [] },
  location: { distrito: 'Castilla', provincia: 'Piura', departamento: 'Piura', calle: '', urbanizacion: '' },
  media: { photoKeys: [] },
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/property/listing_1']}>
      <Routes>
        <Route path="/property/:id" element={<PropertyPage />} />
        <Route path="/app/login" element={<p>PANTALLA DE INGRESO</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function openGateWith(reason: ContactDenialReason) {
  getListingContactMock.mockRejectedValue(new ContactDenied(reason))
  renderPage()
  fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }))
  await screen.findByText(/Escríbele al propietario/i, { selector: 'h3' })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockProperty.listing = LISTING
  mockProperty.property = PROPERTY
  mockAuth.firebaseUser = { emailVerified: true }
  mockAuth.user = { id: 'viewer', isPhoneVerified: false }
  logoutMock.mockResolvedValue(undefined)
})

afterEach(() => vi.restoreAllMocks())

describe('"otra vez" only when the number really was verified', () => {
  it('a new person with no phone yet: "Solo esta vez"', async () => {
    await openGateWith('needs-phone-reverification')
    expect(screen.getByText(/verifica tu número\. Solo esta vez\./i)).toBeTruthy()
    expect(screen.queryByText(/otra vez/i)).toBeNull()
  })

  it('a profile that says verified, but no phone attached: "otra vez"', async () => {
    mockAuth.user = { id: 'viewer', isPhoneVerified: true }
    await openGateWith('needs-phone-reverification')
    expect(screen.getByText(/verifica tu número otra vez/i)).toBeTruthy()
  })
})

describe('"Usar otra cuenta" on the contact window', () => {
  it('is offered to a signed-in person', async () => {
    await openGateWith('needs-phone-reverification')
    expect(screen.getByRole('button', { name: /usar otra cuenta/i })).toBeTruthy()
  })

  it('is NOT offered to a visitor (there is no account to leave)', async () => {
    mockAuth.firebaseUser = null
    mockAuth.user = null
    await openGateWith('needs-login')
    expect(screen.queryByRole('button', { name: /usar otra cuenta/i })).toBeNull()
  })

  it('signs out, keeps THIS listing as the errand, and opens the sign-in door', async () => {
    await openGateWith('needs-phone-reverification')
    fireEvent.click(screen.getByRole('button', { name: /usar otra cuenta/i }))
    await screen.findByText('PANTALLA DE INGRESO')
    expect(logoutMock).toHaveBeenCalledOnce()
    expect(peekReturnUrl()?.url).toBe('/property/listing_1#contactar')
  })

  it('counts as a way out of the gate, so the funnel still adds up', async () => {
    await openGateWith('needs-phone-reverification')
    contactGateStepMock.mockClear()
    fireEvent.click(screen.getByRole('button', { name: /usar otra cuenta/i }))
    await waitFor(() => expect(contactGateStepMock).toHaveBeenCalledWith('gate_dismissed'))
  })

  it('a failed sign-out stays on the listing and says so in Spanish', async () => {
    const { toast } = await import('sonner')
    logoutMock.mockRejectedValue(new Error('offline'))
    await openGateWith('needs-phone-reverification')
    fireEvent.click(screen.getByRole('button', { name: /usar otra cuenta/i }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(
      'No pudimos cerrar tu sesión. Revisa tu conexión e intenta de nuevo.',
    ))
    expect(screen.queryByText('PANTALLA DE INGRESO')).toBeNull()
  })
})
