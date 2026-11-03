// @vitest-environment jsdom
/**
 * After an owner changes one of their listings, BOTH the owner's cards (Mis
 * propiedades / Mi panel) and the explore map + list show the server's new
 * state at once — no reload (Jerson, 2026-11-02, after the app kept showing a
 * refunded boost as "DESTACADO · 29 DÍAS").
 *
 * The real hooks run against a real QueryClient. Only the database is fake:
 * each action changes it the way the server does, and the test reads what the
 * screens' queries hold afterwards. The explore query is the real paginated
 * one, ordered as Firestore orders it (boostScore, then publishedAt).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, renderHook, waitFor, fireEvent, screen } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Listing } from '@/types/listing'
import type { ListingWithProperty } from '@/types/explore'
import { mapListing } from '@/lib/map/__tests__/mapListingFixture'

// ── The fake database ──────────────────────────────────────────────────────
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

vi.mock('@/services/firestoreService', () => ({
  firestoreService: {
    getUserListingsWithProperties: async (uid: string) =>
      [...db.listings.values()].filter((i) => i.listing.ownerId === uid),
    getListingWithProperty: async (id: string) => db.listings.get(id) ?? null,
    getActiveListingsWithPropertiesPaginated: async (_n: number, _cursor: unknown, op?: string) => ({
      items: [...db.listings.values()]
        .filter((i) => i.listing.status === 'active' && (!op || i.listing.operationType === op))
        .sort((a, b) =>
          (b.listing.boostScore ?? 1) - (a.listing.boostScore ?? 1) ||
          (b.listing.publishedAt?.getTime() ?? 0) - (a.listing.publishedAt?.getTime() ?? 0)),
      lastDoc: undefined,
      hasMore: false,
    }),
    deactivateListing: async (id: string) => patch(id, { status: 'deactivated' }),
    activateListing: async (id: string) => patch(id, { status: 'active', publishedAt: new Date() }),
    updateListingStatus: async (id: string, status: Listing['status']) => patch(id, { status }),
    deleteListing: async (id: string) => { db.listings.delete(id) },
    deleteProperty: async () => {},
    updateListing: async (id: string, fields: Partial<Listing>) => patch(id, fields),
  },
}))

// The refund function takes this purchase's days off before it returns
// (refundBoostPayment → applyFullRefund), leaving boostedUntil behind.
vi.mock('@/services/boostService', () => ({
  boostService: {
    requestRefund: async () =>
      patch('mine', { isBoosted: false, boostScore: 1, boostTier: undefined }),
    isPaymentCompleted: async (paymentId: string) => db.paymentCompleted.has(paymentId),
    getUserBoostPayments: async () => [],
    getBoostTierConfigurations: async () => [],
    createBoostPaymentIntent: async () => ({ clientSecret: 'cs_1', paymentId: 'pay_1' }),
  },
}))

import { useUserListingsWithProperties, useListingDetails, useToggleListingStatus, useMarkListingClosed, useDeleteListing, useSetRealtorHelp } from '../useListings'
import { useExploreListings } from '../useExploreListings'
import { useRefundBoostPayment } from '../useBoost'

const DAY = 24 * 60 * 60 * 1000

function seed(mine: Partial<Listing> = {}) {
  db.listings.clear()
  db.paymentCompleted.clear()
  const other = mapListing({ id: 'other', publishedAt: new Date(Date.now() - DAY) })
  const own = mapListing({ id: 'mine', publishedAt: new Date(Date.now() - 30 * DAY) })
  db.listings.set('other', { ...other, listing: { ...other.listing, ownerId: 'someone-else' } })
  db.listings.set('mine', { ...own, listing: { ...own.listing, ...mine } })
}

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 }, mutations: { retry: false } } })
}

/** Every screen that shows the listing, mounted at once. */
function useScreens() {
  const owner = useUserListingsWithProperties('owner-1')
  const todos = useExploreListings(null)
  const venta = useExploreListings('venta')
  const detail = useListingDetails('mine')
  return { owner, todos, venta, detail }
}

function mount() {
  const client = newClient()
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children)
  const screens = renderHook(() => useScreens(), { wrapper })
  return { client, wrapper, screens }
}

type Screens = ReturnType<typeof useScreens>
const ownerCard = (s: Screens) => s.owner.data?.find((i) => i.listing.id === 'mine')?.listing
const exploreIds = (s: Screens, tab: 'todos' | 'venta') => s[tab].data.map((i) => i.listing.id)

async function loaded(screens: { result: { current: Screens } }) {
  await waitFor(() => {
    expect(screens.result.current.owner.data).toBeDefined()
    expect(screens.result.current.todos.data.length).toBeGreaterThan(0)
    expect(screens.result.current.venta.data.length).toBeGreaterThan(0)
    expect(screens.result.current.detail.data).toBeDefined()
  })
}

beforeEach(() => seed())

describe('every owner action refreshes the owner card AND the explore map/list', () => {
  it('deactivate: the card says Desactivado and the listing leaves the map', async () => {
    const { wrapper, screens } = mount()
    await loaded(screens)
    const { result } = renderHook(() => useToggleListingStatus(), { wrapper })
    await act(() => result.current.mutateAsync({ listingId: 'mine', currentStatus: 'active' }))
    await waitFor(() => {
      expect(ownerCard(screens.result.current)?.status).toBe('deactivated')
      expect(exploreIds(screens.result.current, 'todos')).not.toContain('mine')
      expect(exploreIds(screens.result.current, 'venta')).not.toContain('mine')
      expect(screens.result.current.detail.data?.listing.status).toBe('deactivated')
    })
  })

  it('reactivate (volver a publicar): the card is Activo and the listing is back on the map', async () => {
    seed({ status: 'deactivated' })
    const { wrapper, screens } = mount()
    await waitFor(() => expect(screens.result.current.owner.data).toBeDefined())
    await waitFor(() => expect(screens.result.current.todos.data.length).toBe(1))
    const { result } = renderHook(() => useToggleListingStatus(), { wrapper })
    await act(() => result.current.mutateAsync({ listingId: 'mine', currentStatus: 'deactivated' }))
    await waitFor(() => {
      expect(ownerCard(screens.result.current)?.status).toBe('active')
      expect(exploreIds(screens.result.current, 'todos')).toContain('mine')
      expect(exploreIds(screens.result.current, 'venta')).toContain('mine')
    })
  })

  it.each(['sold', 'rented'] as const)('mark %s: the card shows it and the listing leaves the map', async (status) => {
    const { wrapper, screens } = mount()
    await loaded(screens)
    const { result } = renderHook(() => useMarkListingClosed(), { wrapper })
    await act(() => result.current.mutateAsync({ listingId: 'mine', status }))
    await waitFor(() => {
      expect(ownerCard(screens.result.current)?.status).toBe(status)
      expect(exploreIds(screens.result.current, 'todos')).not.toContain('mine')
    })
  })

  it('delete: gone from the cards and from the map', async () => {
    const { wrapper, screens } = mount()
    await loaded(screens)
    const { result } = renderHook(() => useDeleteListing(), { wrapper })
    await act(() => result.current.mutateAsync({ listingId: 'mine', propertyId: 'p-mine' }))
    await waitFor(() => {
      expect(ownerCard(screens.result.current)).toBeUndefined()
      expect(exploreIds(screens.result.current, 'todos')).not.toContain('mine')
    })
  })

  it.each([true, false])('agent help %s: the card and the explore copy both carry it', async (on) => {
    seed({ wantsRealtorHelp: !on })
    const { wrapper, screens } = mount()
    await loaded(screens)
    const { result } = renderHook(() => useSetRealtorHelp(), { wrapper })
    await act(() => result.current.mutateAsync({ listingId: 'mine', on }))
    await waitFor(() => {
      expect(ownerCard(screens.result.current)?.wantsRealtorHelp).toBe(on)
      expect(screens.result.current.todos.data.find((i) => i.listing.id === 'mine')?.listing.wantsRealtorHelp).toBe(on)
    })
  })

  it('boost refund: the card loses DESTACADO and the listing drops from first place', async () => {
    seed({ isBoosted: true, boostScore: 100, boostTier: 'thirtyDays', boostedUntil: new Date(Date.now() + 29 * DAY) })
    const { wrapper, screens } = mount()
    await loaded(screens)
    expect(exploreIds(screens.result.current, 'todos')[0]).toBe('mine')
    const { result } = renderHook(() => useRefundBoostPayment(), { wrapper })
    await act(() => result.current.mutateAsync('pay_1'))
    await waitFor(() => {
      expect(ownerCard(screens.result.current)?.isBoosted).toBe(false)
      expect(exploreIds(screens.result.current, 'todos')).toEqual(['other', 'mine'])
      expect(exploreIds(screens.result.current, 'venta')).toEqual(['other', 'mine'])
      expect(screens.result.current.detail.data?.listing.isBoosted).toBe(false)
    })
  })
})

// ── Boost: refreshed when the payment is CONFIRMED ─────────────────────────

vi.mock('@/lib/analytics', () => ({ AnalyticsLogger: new Proxy({}, { get: () => () => {} }) }))
vi.mock('@/app/features/boost/components/BoostTierSelectionModal', () => ({
  default: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: (t: string) => void }) =>
    isOpen ? <button onClick={() => onConfirm('thirtyDays')}>tier:confirm</button> : null,
}))
vi.mock('@/app/features/boost/components/StripePaymentModal', () => ({
  default: ({ isOpen, onSuccess }: { isOpen: boolean; onSuccess: () => void }) =>
    isOpen ? <button onClick={onSuccess}>pay:success</button> : null,
}))

import BoostPurchaseFlow from '@/app/features/boost/components/BoostPurchaseFlow'

/** What the server's webhook does once Stripe says paid. */
function webhookLands() {
  patch('mine', { isBoosted: true, boostScore: 100, boostTier: 'thirtyDays', boostedUntil: new Date(Date.now() + 30 * DAY) })
  db.paymentCompleted.add('pay_1')
}

function Screens({ onState }: { onState: (s: Screens) => void }) {
  onState(useScreens())
  return null
}

function mountWithFlow() {
  const client = newClient()
  const latest: { current: Screens | null } = { current: null }
  render(
    <QueryClientProvider client={client}>
      <Screens onState={(s) => { latest.current = s }} />
      <BoostPurchaseFlow listingId="mine" placement="my_listings" onSuccess={() => {}}>
        {(open) => <button onClick={open}>open</button>}
      </BoostPurchaseFlow>
    </QueryClientProvider>,
  )
  return latest
}

async function pay() {
  fireEvent.click(screen.getByRole('button', { name: 'open' }))
  fireEvent.click(screen.getByRole('button', { name: 'tier:confirm' }))
  fireEvent.click(await screen.findByRole('button', { name: 'pay:success' }))
}

describe('boost: both screens refresh from the confirmed payment', () => {
  it('confirmed while waiting: the card is boosted and the listing is first on the map', async () => {
    const latest = mountWithFlow()
    await waitFor(() => expect(latest.current?.todos.data.length).toBe(2))
    expect(exploreIds(latest.current!, 'todos')[0]).toBe('other')
    webhookLands()
    await pay()
    await waitFor(() => {
      expect(ownerCard(latest.current!)?.isBoosted).toBe(true)
      expect(exploreIds(latest.current!, 'todos')[0]).toBe('mine')
      expect(exploreIds(latest.current!, 'venta')[0]).toBe('mine')
      expect(latest.current!.detail.data?.listing.isBoosted).toBe(true)
    })
  })

  it('the webhook is late (after the 20-second wait): both screens still update when it lands, without a reload', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const latest = mountWithFlow()
      await waitFor(() => expect(latest.current?.todos.data.length).toBe(2))
      await pay()
      // The 20-second wait runs out with no confirmation.
      await act(async () => { await vi.advanceTimersByTimeAsync(25_000) })
      expect(ownerCard(latest.current!)?.isBoosted).not.toBe(true)
      // Then Stripe's event arrives.
      webhookLands()
      await act(async () => { await vi.advanceTimersByTimeAsync(15_000) })
      await waitFor(() => {
        expect(ownerCard(latest.current!)?.isBoosted).toBe(true)
        expect(exploreIds(latest.current!, 'todos')[0]).toBe('mine')
      })
    } finally {
      vi.useRealTimers()
    }
  })
})
