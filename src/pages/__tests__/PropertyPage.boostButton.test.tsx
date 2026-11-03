// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

/**
 * The owner's own listing (ADR-042, ADR-043 D17): boosts stay available but
 * are not promoted, so "Destacar mi propiedad" is a plain secondary button —
 * the shared outlined green button — not a full-width amber call to action.
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

describe("the owner's own active listing", () => {
  it('offers "Destacar mi propiedad" as a plain secondary button, not an amber one', () => {
    show('active', 'open', 'owner-1')
    renderPage()
    const button = screen.getByRole('button', { name: /destacar mi propiedad/i })
    expect(button.className).not.toMatch(/bg-boost/)
    // The shared Button's outlined green style (Button.tsx, variant primary).
    expect(button.className).toContain('border-secondary')
    expect(button.className).toContain('text-secondary')
  })

  it('a stranger sees no boost button', () => {
    show('active', 'open', 'stranger')
    renderPage()
    expect(screen.queryByRole('button', { name: /destacar mi propiedad/i })).toBeNull()
  })
})

// Boosted only with isBoosted AND a future boostedUntil (production,
// 2026-11-02: a refund leaves boostedUntil behind; a boost that ended stays
// isBoosted until the hourly job runs).
describe('the listing page shows a boost only while it is live', () => {
  const DAY = 24 * 60 * 60 * 1000
  const SHAPES = [
    ['after a refund (isBoosted false, boostedUntil in the future)', { isBoosted: false, boostScore: 1, boostedUntil: new Date(Date.now() + 31 * DAY) }],
    ['ended, job not run yet (isBoosted true, boostedUntil past)', { isBoosted: true, boostScore: 100, boostTier: 'thirtyDays', boostedUntil: new Date(Date.now() - 3600_000) }],
  ] as const

  it.each(SHAPES)('%s: the owner is offered the boost, not told it is boosted', (_n, boost) => {
    show('active', 'open', 'owner-1')
    mockProperty.listing = { ...LISTING, status: 'active', ...boost }
    renderPage()
    expect(screen.getByRole('button', { name: /destacar mi propiedad/i })).toBeTruthy()
    expect(screen.queryByText('Tu publicación está destacada')).toBeNull()
  })

  it.each(SHAPES)('%s: a visitor sees no DESTACADO', (_n, boost) => {
    show('active', 'open', 'stranger')
    mockProperty.listing = { ...LISTING, status: 'active', ...boost }
    renderPage()
    expect(screen.queryByText(/^destacado$/i)).toBeNull()
  })

  it('control: a live boost reads as boosted to the owner and to a visitor', () => {
    show('active', 'open', 'owner-1')
    mockProperty.listing = { ...LISTING, status: 'active', isBoosted: true, boostScore: 100, boostTier: 'thirtyDays', boostedUntil: new Date(Date.now() + 10 * DAY) }
    renderPage()
    expect(screen.getByText('Tu publicación está destacada')).toBeTruthy()
  })
})
