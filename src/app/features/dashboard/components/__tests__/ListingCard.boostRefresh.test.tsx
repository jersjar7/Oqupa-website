// @vitest-environment jsdom
/**
 * Boosting from Mis propiedades (2026-11-02): once the payment is confirmed
 * the card shows what the server now says — DESTACADO with the server's days —
 * and the "Tu publicación ahora está destacada" confirmation stays on screen.
 * The card used to patch itself with a guessed boost (7 days if the tiers had
 * not loaded); that flipped the card to boosted, which removed the boost flow
 * from the page, and the confirmation with it.
 *
 * And the owner card follows the one rule: boosted only with isBoosted AND a
 * future boostedUntil (a refund leaves boostedUntil behind).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Listing } from '@/types/listing'
import type { ListingWithProperty } from '@/types/explore'
import { mapListing } from '@/lib/map/__tests__/mapListingFixture'

const db = vi.hoisted(() => ({
  listings: new Map<string, ListingWithProperty>(),
  paymentCompleted: new Set<string>(),
}))
const patch = (id: string, fields: Partial<Listing>) => {
  const item = db.listings.get(id)!
  db.listings.set(id, { ...item, listing: { ...item.listing, ...fields } })
}

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }))
vi.mock('firebase/firestore', () => ({}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/lib/analytics', () => ({ AnalyticsLogger: new Proxy({}, { get: () => () => {} }) }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ user: { id: 'owner-1' } }) }))
vi.mock('@/components/ShareFormatModal', () => ({ default: () => null }))
vi.mock('../CloseSurveyModal', () => ({ default: () => null }))
vi.mock('@/app/components/ui', () => ({
  Button: ({ children, onClick, isLoading: _l, variant: _v, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { isLoading?: boolean; variant?: string }) => (
    <button onClick={onClick} {...rest}>{children}</button>
  ),
  PhotoCarousel: () => null,
  PhotoOverlayBadge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))
vi.mock('react-router-dom', () => ({ Link: ({ children }: { children: React.ReactNode }) => <>{children}</> }))
vi.mock('@/services/firestoreService', () => ({
  firestoreService: {
    getUserListingsWithProperties: async (uid: string) =>
      [...db.listings.values()].filter((i) => i.listing.ownerId === uid),
  },
}))
vi.mock('@/services/boostService', () => ({
  boostService: {
    isPaymentCompleted: async (id: string) => db.paymentCompleted.has(id),
    getBoostTierConfigurations: async () => [
      { tier: 'thirtyDays', displayName: '30 días', durationDays: 30, feeInSoles: 29.9 },
    ],
    createBoostPaymentIntent: async () => ({ clientSecret: 'cs_1', paymentId: 'pay_1' }),
  },
}))
vi.mock('@/app/features/boost/components/BoostTierSelectionModal', () => ({
  default: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: (t: string) => void }) =>
    isOpen ? <button onClick={() => onConfirm('thirtyDays')}>tier:confirm</button> : null,
}))
vi.mock('@/app/features/boost/components/StripePaymentModal', () => ({
  default: ({ isOpen, onSuccess }: { isOpen: boolean; onSuccess: () => void }) =>
    isOpen ? <button onClick={onSuccess}>pay:success</button> : null,
}))

import ListingCard from '../ListingCard'
import { useUserListingsWithProperties } from '@/hooks/useListings'

const DAY = 24 * 60 * 60 * 1000

function seed(fields: Partial<Listing> = {}) {
  db.listings.clear()
  db.paymentCompleted.clear()
  const item = mapListing({ id: 'mine' })
  db.listings.set('mine', { ...item, listing: { ...item.listing, ...fields } })
}

function MisPropiedades() {
  const { data } = useUserListingsWithProperties('owner-1')
  return <>{data?.map((i) => <ListingCard key={i.listing.id} listing={i.listing} property={i.property} />)}</>
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MisPropiedades /></QueryClientProvider>)
}

beforeEach(() => seed())

describe('ListingCard — boosting refreshes from the confirmed payment', () => {
  it("shows the server's boost and keeps the confirmation on screen", async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: /destacar mi propiedad/i }))
    fireEvent.click(screen.getByRole('button', { name: 'tier:confirm' }))
    const paid = await screen.findByRole('button', { name: 'pay:success' })
    // The webhook: 30 days, as the server writes them.
    patch('mine', { isBoosted: true, boostScore: 100, boostTier: 'thirtyDays', boostedUntil: new Date(Date.now() + 30 * DAY - 60_000) })
    db.paymentCompleted.add('pay_1')
    fireEvent.click(paid)

    expect(await screen.findByText('Tu publicación ahora está destacada')).toBeTruthy()
    await waitFor(() => expect(screen.getByText(/30 días restantes/)).toBeTruthy())
    // Still there once the card has refreshed underneath it.
    expect(screen.getByText('Tu publicación ahora está destacada')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /destacar mi propiedad/i })).toBeNull()
  })
})

describe('ListingCard — boosted only while the boost is live', () => {
  it('after a refund (isBoosted false, boostedUntil in the future): no DESTACADO, the boost is offered again', async () => {
    seed({ isBoosted: false, boostScore: 1, boostedUntil: new Date(Date.now() + 31 * DAY) })
    renderPage()
    expect(await screen.findByRole('button', { name: /destacar mi propiedad/i })).toBeTruthy()
    expect(screen.queryByText(/restante/)).toBeNull()
  })

  it('a boost that ended before the hourly job ran (isBoosted true, boostedUntil past): no DESTACADO, offered again', async () => {
    seed({ isBoosted: true, boostScore: 100, boostTier: 'thirtyDays', boostedUntil: new Date(Date.now() - 60 * 60 * 1000) })
    renderPage()
    expect(await screen.findByRole('button', { name: /destacar mi propiedad/i })).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/destacado/i)
  })
})
