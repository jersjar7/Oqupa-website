// @vitest-environment jsdom
// The beta notice heads the Analítica page in every state it can show (break-it #2).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Block, OwnerAnalytics, OwnerListing } from '../types'

vi.mock('recharts', async (orig) => {
  const actual = await orig<typeof import('recharts')>()
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 400, height: 200 }}>{children}</div> }
})
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ user: { id: 'owner-1' } }) }))
vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: () => undefined }))

const hooks = vi.hoisted(() => ({ owner: { status: 'loading' } as unknown }))
vi.mock('../useOwnerAnalytics', () => ({
  useOwnerAnalytics: () => hooks.owner,
  useListingAnalytics: () => ({ data: null, loading: false, missing: true }),
}))

import AnalyticsPage from '../pages/AnalyticsPage'

const block = (): Block => ({
  from: '2026-11-05', to: '2026-11-14',
  totals: { shown: 120, seen: 15, contacts: 1, saved: 2, whatsapp: null },
  previous: null,
  heat: { status: 'too-few', n: 15, min: 20 },
  sources: { status: 'not-recorded' },
  places: { status: 'not-recorded' },
  marks: { status: 'ok', list: [], pricesSince: '2026-11-05', photosSince: null },
  demand: { status: 'not-recorded' },
} as unknown as Block)

const listing = { id: 'L1', name: 'Casa', sub: '', propertyType: 'casa', operationType: 'venta', status: 'active', district: 'Piura',
  publishedDay: '2026-11-01', daysPublished: 14, photoCount: 1, photoKey: null, saves: 0,
  totals: { '7': { shown: 1, seen: 1, contacts: 0 }, '30': { shown: 1, seen: 1, contacts: 0 }, '90': { shown: 1, seen: 1, contacts: 0 } },
  seen: [1], note: { kind: 'ok' } } as unknown as OwnerListing

const ready = (): OwnerAnalytics => ({
  ownerId: 'owner-1', today: '2026-11-15', dataTo: '2026-11-14',
  countingSince: { counts: '2026-11-05', via: null, place: null, whatsapp: null, prices: null, photos: null, searches: null },
  thresholds: {}, featuredListingId: 'L1',
  series: { start: '2026-11-05', shown: [1], seen: [1], contacts: [0] },
  listings: [listing, { ...listing, id: 'L2' }],
  periods: { '7': block(), '30': block(), '90': block() },
} as unknown as OwnerAnalytics)

/** The notice is the first piece of content in the page. */
function expectNoticeFirst(container: HTMLElement) {
  const notice = screen.getByRole('region', { name: /analítica está en beta/i })
  const first = container.querySelector('section, p, h2, select, button, a')
  expect(notice.contains(first)).toBe(true)
}

describe('Analítica page — the beta notice comes first', () => {
  beforeEach(() => { localStorage.clear() })

  it('with numbers', () => {
    hooks.owner = { status: 'ready', data: ready(), refreshing: false }
    expectNoticeFirst(render(<MemoryRouter><AnalyticsPage /></MemoryRouter>).container)
  })

  it('with no listings yet', () => {
    hooks.owner = { status: 'none' }
    expectNoticeFirst(render(<MemoryRouter><AnalyticsPage /></MemoryRouter>).container)
  })

  it('when the numbers could not load', () => {
    hooks.owner = { status: 'error' }
    expectNoticeFirst(render(<MemoryRouter><AnalyticsPage /></MemoryRouter>).container)
  })
})
