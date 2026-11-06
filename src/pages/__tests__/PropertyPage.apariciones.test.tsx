// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

/**
 * ADR-051 on the listing page: everyone sees Vistas (as today); only the
 * owner sees Apariciones, and only the owner's page ever asks for it (the
 * total is owner-only).
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
vi.mock('@/hooks/useListingCounts', () => ({ useCountSeenWhileOpen: () => {}, useCountShownWhenVisible: () => () => {} }))
const aparicionesHook = vi.hoisted(() => vi.fn((_ids: string[], _owner?: string) => ({ byId: {} as Record<string, number | undefined>, total: 210 as number | undefined, isLoading: false, isError: false })))
vi.mock('@/hooks/useListingApariciones', () => ({ useListingsApariciones: (ids: string[], owner?: string) => aparicionesHook(ids, owner) }))
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
vi.mock('@/app/features/boost/components/BoostPurchaseFlow', () => ({
  default: ({ children }: { children: (open: () => void) => React.ReactNode }) => <>{children(() => {})}</>,
}))
vi.mock('@/components/ShareFormatModal', () => ({ default: () => null }))
vi.mock('@/app/components/GalleryModal', () => ({ default: () => null }))
vi.mock('@/components/AppStoreBadges', () => ({ default: () => null }))

import PropertyPage from '../PropertyPage'

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

describe('Apariciones on the listing page', () => {
  it('the owner sees Apariciones beside Vistas', () => {
    show('active', 'open', 'owner-1')
    renderPage()
    expect(screen.getByText(/3 vistas/)).toBeTruthy()
    expect(screen.getByText(/3 vistas · 210 apariciones/)).toBeTruthy()
    expect(aparicionesHook).toHaveBeenLastCalledWith(['listing_1'], 'owner-1')
  })

  it('a visitor sees Vistas only, and the page never asks for Apariciones', () => {
    show('active', 'open', 'stranger')
    renderPage()
    expect(screen.getByText(/3 vistas/)).toBeTruthy()
    expect(screen.queryByText(/aparici/)).toBeNull()
    for (const [ids] of aparicionesHook.mock.calls) expect(ids).toEqual([])
  })

  it('unknown Apariciones is not shown as 0', () => {
    aparicionesHook.mockReturnValue({ byId: {}, total: undefined, isLoading: true, isError: false })
    show('active', 'open', 'owner-1')
    renderPage()
    expect(screen.queryByText(/aparici/)).toBeNull()
  })
})
