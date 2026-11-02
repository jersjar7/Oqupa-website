// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

/**
 * The listing page, feature audit 2026-11-02 (sections A and B; ADR-046 #5, #6).
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
  toastMock,
} = vi.hoisted(() => ({
  listingViewedMock: vi.fn(),
  contactRevealedMock: vi.fn(),
  contactTappedMock: vi.fn(),
  contactGateStepMock: vi.fn(),
  contactRevealFailedMock: vi.fn(),
  getListingContactMock: vi.fn(),
  mockAuth: { firebaseUser: null as unknown, user: null as unknown },
  logoutMock: vi.fn(),
  toastMock: { error: vi.fn(), success: vi.fn() },
}))

const mockProperty = {
  listing: null as unknown,
  property: null as unknown,
  isLoading: false,
  error: null as unknown,
  failure: null as unknown,
  refetch: vi.fn(),
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
vi.mock('sonner', () => ({ toast: toastMock }))
vi.mock('@/components/lists/SaveButton', () => ({ default: () => null }))
vi.mock('@/app/features/boost/components/BoostPurchaseFlow', () => ({ default: () => null }))
vi.mock('@/components/ShareFormatModal', () => ({ default: () => null }))
vi.mock('@/app/components/GalleryModal', () => ({ default: () => null }))
vi.mock('@/components/AppStoreBadges', () => ({ default: () => null }))

import PropertyPage from '../PropertyPage'
import { ContactDenied } from '@/services/contactService'

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

vi.mock('@/app/features/listings/components/ReportListing', () => ({
  default: () => <button type="button">Reportar anuncio</button>,
}))

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockProperty.listing = LISTING
  mockProperty.property = PROPERTY
  mockProperty.isLoading = false
  mockProperty.error = null
  mockProperty.failure = null
  mockAuth.firebaseUser = { emailVerified: true }
  mockAuth.user = { id: 'viewer', isPhoneVerified: true }
  vi.spyOn(window, 'open').mockReturnValue(null)
})

afterEach(() => vi.restoreAllMocks())

describe('after the gate: the number with LLAMAR and COPIAR (ADR-046 #6)', () => {
  it('shows the number once the server hands it over', async () => {
    getListingContactMock.mockResolvedValue({ phone: '+51912345678', displayName: 'María López', contactRole: 'owner', counted: true })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }))
    await screen.findByText('+51 912 345 678')
    expect(screen.getByRole('link', { name: 'Llamar' }).getAttribute('href')).toBe('tel:+51912345678')
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeTruthy()
  })

  it('WhatsApp opens with the app greeting, which says Oqupa', async () => {
    getListingContactMock.mockResolvedValue({ phone: '+51912345678', displayName: 'María López', contactRole: 'owner', counted: true })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }))
    await waitFor(() => expect(window.open).toHaveBeenCalled())
    const url = decodeURIComponent(String((window.open as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0]))
    expect(url).toContain('Hola María, vi tu propiedad en Oqupa: Casa en Castilla por US$ 1,200. Me interesa obtener más información.')
  })

  it('offline says so, with the next step', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    getListingContactMock.mockRejectedValue(new ContactDenied('unavailable'))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }))
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Sin conexión. Revisa tu internet y vuelve a intentarlo.'))
  })

  it('the daily limit uses the server sentence', async () => {
    getListingContactMock.mockRejectedValue(new ContactDenied('rate-limited'))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }))
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith('Has visto muchos contactos hoy. Intenta de nuevo mañana.'))
  })

  it('says ABRIENDO WHATSAPP while it asks', async () => {
    getListingContactMock.mockReturnValue(new Promise(() => {}))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }))
    expect(await screen.findByText('Abriendo WhatsApp…')).toBeTruthy()
  })

  it('the tip no longer promises the address is in the message', () => {
    renderPage()
    expect(document.body.textContent).not.toMatch(/ya incluye la dirección/)
    expect(document.body.textContent).toMatch(/Consejo: cuéntale cuándo te gustaría visitarla\./)
  })
})

describe('the page itself', () => {
  it('a dollar price is shown in dollars', () => {
    renderPage()
    expect(document.body.textContent).toMatch(/US\$ 1,200/)
    expect(document.body.textContent).not.toMatch(/S\/\. 1,200/)
  })

  it('offers Reportar anuncio (ADR-046 #5)', () => {
    renderPage()
    expect(screen.getByRole('button', { name: 'Reportar anuncio' })).toBeTruthy()
  })

  it('a listing that is gone says it is no longer published, with the map', () => {
    mockProperty.listing = null
    mockProperty.property = null
    mockProperty.failure = 'not-found'
    renderPage()
    expect(screen.getByText('Esta propiedad ya no está publicada')).toBeTruthy()
    expect(screen.getByRole('link', { name: /ver propiedades disponibles/i }).getAttribute('href')).toBe('/explorar')
  })

  it('a failed load is not "deleted": it says offline and offers REINTENTAR', () => {
    mockProperty.listing = null
    mockProperty.property = null
    mockProperty.failure = 'network'
    mockProperty.error = 'Error al cargar la propiedad'
    renderPage()
    expect(screen.getByText('Sin conexión. Revisa tu internet y vuelve a intentarlo.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /reintentar/i }))
    expect(mockProperty.refetch).toHaveBeenCalled()
    expect(screen.queryByText(/ya no está publicada/)).toBeNull()
  })
})
