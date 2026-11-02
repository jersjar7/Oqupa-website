// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

/**
 * A listing's public page by status (2026-10-31, approved by Jerson).
 * A stranger opening a sold house by direct link used to see it as available,
 * with a working WhatsApp button; an owner opening their own deactivated
 * listing was told it did not exist.
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

const { documentMetaMock } = vi.hoisted(() => ({ documentMetaMock: vi.fn() }))

const mockProperty = {
  listing: null as unknown,
  property: null as unknown,
  view: 'open' as string | null,
  isLoading: false,
  error: null as unknown,
}

vi.mock('@/hooks/useProperty', () => ({ useProperty: () => mockProperty }))
vi.mock('@/hooks/useRecordListingView', () => ({ useRecordListingView: () => ({ record: vi.fn() }) }))
vi.mock('@/hooks/useDocumentMeta', () => ({ useDocumentMeta: (m: unknown) => documentMetaMock(m) }))
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
vi.mock('@/components/lists/SaveButton', () => ({ default: () => <button>GUARDAR</button> }))
vi.mock('@/app/features/boost/components/BoostPurchaseFlow', () => ({ default: () => null }))
vi.mock('@/components/ShareFormatModal', () => ({ default: () => null }))
vi.mock('@/app/components/GalleryModal', () => ({ default: () => null }))
vi.mock('@/components/AppStoreBadges', () => ({ default: () => null }))

import PropertyPage from '../PropertyPage'
import { ContactDenied } from '@/services/contactService'
import { toast } from 'sonner'

const LISTING = {
  id: 'listing_1', ownerId: 'owner-1', description: 'Casa',
  price: { amount: 1200, currency: 'USD' }, operationType: 'venta', status: 'active',
  viewCount: 3, showExactLocation: false, media: { photoKeys: [] },
}
const PROPERTY = {
  propertyType: 'casa', operationType: 'venta',
  specs: { totalAreaInSquareMeters: 120, bedroomCount: 3, bathroomCount: 2, propertyAmenities: [] },
  location: { distrito: 'Castilla', provincia: 'Piura', departamento: 'Piura', calle: '', urbanizacion: '' },
  media: { photoKeys: [] },
}

function renderPage(path = '/property/listing_1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/property/:id" element={<PropertyPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function show(status: string, view: string, viewerId = 'stranger') {
  mockProperty.listing = { ...LISTING, status }
  mockProperty.view = view
  mockAuth.user = { id: viewerId, isPhoneVerified: true }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockProperty.property = PROPERTY
  mockAuth.firebaseUser = { emailVerified: true }
})

afterEach(() => vi.restoreAllMocks())

describe('a sold or rented listing, seen by a stranger', () => {
  it.each([
    ['sold', 'Vendido'],
    ['rented', 'Alquilado'],
  ])('%s: says "%s" and offers no way to contact', (status, word) => {
    show(status, 'closed')
    renderPage()
    expect(screen.getByRole('status').textContent).toContain(word)
    expect(screen.queryByRole('button', { name: /whatsapp/i })).toBeNull()
    expect(screen.queryByRole('button', { name: 'GUARDAR' })).toBeNull()
    expect(screen.getByRole('link', { name: /ver propiedades disponibles/i }).getAttribute('href')).toBe('/explorar')
  })

  it('coming back from sign-up to contact (#contactar) does not ask for the number', async () => {
    show('sold', 'closed')
    renderPage('/property/listing_1#contactar')
    await new Promise((r) => setTimeout(r, 0))
    expect(getListingContactMock).not.toHaveBeenCalled()
  })

  it('does not advertise itself as available in the page title', () => {
    show('sold', 'closed')
    renderPage()
    expect(documentMetaMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'Vendido · Casa en Castilla - Oqupa' }),
    )
  })
})

describe('an active listing', () => {
  it('keeps the WhatsApp button and shows no status banner', () => {
    show('active', 'open')
    renderPage()
    expect(screen.getByRole('button', { name: /whatsapp/i })).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
    expect(documentMetaMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ title: 'Casa en Castilla - Oqupa' }),
    )
  })

  it('a listing closed meanwhile: the server refusal is said plainly, no account window', async () => {
    show('active', 'open')
    getListingContactMock.mockRejectedValue(new ContactDenied('listing-not-available'))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Esta publicación ya no está disponible.'),
    )
    expect(screen.queryByText(/Escríbele al propietario/i, { selector: 'h3' })).toBeNull()
  })
})

describe('the owner, on their own listing', () => {
  it('sees a deactivated listing, with a note that only they can see it', () => {
    show('deactivated', 'owner-only', 'owner-1')
    renderPage()
    expect(screen.queryByText('Esta propiedad ya no está publicada')).toBeNull()
    expect(screen.getByRole('status').textContent).toContain(
      'Esta publicación está desactivada. Solo tú puedes verla.',
    )
    expect(screen.queryByRole('button', { name: /whatsapp/i })).toBeNull()
    // The note says it once; no label repeating it.
    expect(screen.getByRole('status').textContent).toBe('Esta publicación está desactivada. Solo tú puedes verla.')
    // A link to a page only they can open would show others "no encontrada".
    expect(screen.queryByRole('button', { name: 'Compartir' })).toBeNull()
  })

  it('sees their sold listing marked Vendido too', () => {
    show('sold', 'closed', 'owner-1')
    renderPage()
    expect(screen.getByRole('status').textContent).toContain('Vendido')
    expect(screen.queryByRole('button', { name: /whatsapp/i })).toBeNull()
  })
})
