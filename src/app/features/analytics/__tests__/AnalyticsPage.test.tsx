// @vitest-environment jsdom
// ADR-058 — the owner Analítica page: every section of the design is on the
// page; a section the server could not fill says "Necesitamos más datos…".
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Block, ListingAnalytics, OwnerAnalytics, OwnerListing } from '../types'

vi.mock('recharts', async (orig) => {
  const actual = await orig<typeof import('recharts')>()
  return { ...actual, ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 400, height: 200 }}>{children}</div> }
})
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ user: { id: 'owner-1' } }) }))
vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: () => undefined }))

const hooks = vi.hoisted(() => ({
  owner: { status: 'loading' } as unknown,
  listing: { data: null, loading: false, missing: false } as unknown,
  listingCalls: [] as Array<string | null>,
}))
vi.mock('../useOwnerAnalytics', () => ({
  useOwnerAnalytics: () => hooks.owner,
  useListingAnalytics: (id: string | null) => { hooks.listingCalls.push(id); return hooks.listing },
}))

import AnalyticsPage from '../pages/AnalyticsPage'

const thinBlock = (over: Partial<Block> = {}): Block => ({
  from: '2026-11-05', to: '2026-11-19',
  totals: { shown: 120, seen: 15, contacts: 1, saved: 2, whatsapp: null },
  previous: null,
  heat: { status: 'too-few', n: 15, min: 20 },
  sources: { status: 'ok', kind: 'platform', n: 15, parts: { app: 10, web: 5 } },
  places: { status: 'not-recorded' },
  marks: { status: 'ok', list: [], pricesSince: '2026-11-05', photosSince: null },
  demand: { status: 'not-recorded' },
  ...over,
})

function listing(id: string, over: Partial<OwnerListing> = {}): OwnerListing {
  return {
    id, name: `Departamento ${id}`, sub: 'Venta · 3 hab. · 95 m²', propertyType: 'departamento', operationType: 'venta',
    status: 'active', district: 'Castilla', publishedDay: '2026-11-01', daysPublished: 19, photoCount: 6, photoKey: null, saves: 1,
    totals: { '7': { shown: 50, seen: 5, contacts: 0 }, '30': { shown: 120, seen: 15, contacts: 1 }, '90': { shown: 120, seen: 15, contacts: 1 } },
    seen: Array(15).fill(1), note: { kind: 'ok' }, ...over,
  }
}

function pageData(): OwnerAnalytics {
  return {
    ownerId: 'owner-1', today: '2026-11-20', dataTo: '2026-11-19',
    countingSince: { counts: '2026-11-05', via: null, place: null, whatsapp: null, prices: '2026-11-05', photos: null, searches: null },
    thresholds: {},
    featuredListingId: 'L1',
    series: { start: '2026-11-05', shown: Array(15).fill(8), seen: Array(15).fill(1), contacts: Array(15).fill(0) },
    listings: [listing('L1'), listing('L2', { note: { kind: 'no-views', days: 7 }, propertyType: 'casa', name: 'Casa L2' })],
    periods: { '7': thinBlock({ from: '2026-11-13' }), '30': thinBlock(), '90': thinBlock() },
  }
}

function listingData(): ListingAnalytics {
  const b = thinBlock({
    zone: { status: 'too-few', n: 2, min: 5 },
    compare: { status: 'too-few-owners', n: 2, min: 3 },
    daysToClose: { status: 'too-few', n: 0, min: 10 },
    contactRate: { status: 'too-few', n: 15, min: 30 },
  })
  return { listingId: 'L1', ownerId: 'owner-1', today: '2026-11-20', series: pageData().series, periods: { '7': b, '30': b, '90': b } }
}

const renderPage = () => render(<MemoryRouter><AnalyticsPage /></MemoryRouter>)

describe('Analítica page (ADR-058)', () => {
  beforeEach(() => {
    hooks.owner = { status: 'ready', data: pageData(), refreshing: false }
    hooks.listing = { data: listingData(), loading: false, missing: false }
    hooks.listingCalls = []
  })

  it('every section of the design is on the page', () => {
    renderPage()
    for (const id of ['cards', 'trend', 'funnel', 'heat', 'sources', 'places', 'zone', 'compare', 'demand', 'portfolio']) {
      expect(screen.getByTestId(`analytics-${id}`)).toBeTruthy()
    }
    expect(screen.getByRole('button', { name: 'Descargar reporte' })).toBeTruthy()
  })

  it('thin sections say what is missing and how much is needed — never a fake number', () => {
    renderPage()
    expect(within(screen.getByTestId('analytics-heat')).getByRole('note').textContent)
      .toBe('Necesitamos más datos: hay 15 vistas y hacen falta al menos 20.')
    expect(within(screen.getByTestId('analytics-places')).getByRole('note').textContent)
      .toBe('Necesitamos más datos. Todavía no registramos dónde están las personas que miran.')
    expect(within(screen.getByTestId('analytics-zone')).getByRole('note').textContent)
      .toBe('Necesitamos más datos: hay 2 propiedades parecidas en Castilla y hacen falta al menos 5.')
    expect(within(screen.getByTestId('analytics-compare')).getAllByRole('note')[0]?.textContent)
      .toBe('Necesitamos más datos: las propiedades parecidas en Castilla son de muy pocos dueños para compararlas.')
    expect(within(screen.getByTestId('analytics-demand')).getByRole('note').textContent)
      .toBe('Necesitamos más datos. Todavía no registramos las búsquedas en el mapa.')
  })

  it('the cards show the period\'s numbers; no change against a period before counting began', () => {
    renderPage()
    const cards = screen.getByTestId('analytics-cards')
    expect(within(cards).getByText('120')).toBeTruthy()
    expect(within(cards).getByText('12.5%')).toBeTruthy() // 15 ÷ 120
    expect(within(cards).queryByText(/▲|▼/)).toBeNull()
  })

  it('the funnel says WhatsApp taps are not recorded yet', () => {
    renderPage()
    expect(within(screen.getByTestId('analytics-funnel')).getByText('Necesitamos más datos. Todavía no registramos cuándo abren WhatsApp.')).toBeTruthy()
  })

  it('App vs Web until arrival is recorded, and it says so', () => {
    renderPage()
    const s = screen.getByTestId('analytics-sources')
    expect(within(s).getByText('67%')).toBeTruthy()
    expect(within(s).getByText(/Todavía no registramos de dónde llega cada persona/)).toBeTruthy()
  })

  it('"all" shows the most-opened listing in the comparisons and says which one', () => {
    renderPage()
    expect(hooks.listingCalls[hooks.listingCalls.length - 1]).toBe('L1')
    expect(screen.getByText(/Las comparaciones de abajo son de/)).toBeTruthy()
  })

  it('picking a listing narrows the page to it', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Propiedad'), { target: { value: 'L2' } })
    expect(hooks.listingCalls[hooks.listingCalls.length - 1]).toBe('L2')
    expect(screen.queryByText(/Las comparaciones de abajo son de/)).toBeNull()
  })

  it('the period switch marks the chosen period', () => {
    renderPage()
    const seven = screen.getByRole('button', { name: '7 días' })
    fireEvent.click(seven)
    expect(seven.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText(/Del 13 nov al 19 nov/)).toBeTruthy()
  })

  it('Tu cartera: facts with la/lo, never a verdict', () => {
    renderPage()
    expect(within(screen.getByTestId('analytics-portfolio')).getAllByText('Nadie la abrió en 7 días').length).toBeGreaterThan(0)
  })

  it('more vistas than apariciones (shared links) never reads as a rate over 100% (break-it web #4)', () => {
    const data = pageData()
    data.periods['30'] = thinBlock({ totals: { shown: 2, seen: 10, contacts: 0, saved: 0, whatsapp: null } })
    hooks.owner = { status: 'ready', data, refreshing: false }
    renderPage()
    expect(screen.queryByText(/500%/)).toBeNull()
    expect(screen.getByText('la mayoría llega por un enlace')).toBeTruthy()
    expect(screen.getByText('Más veces de las que se mostraron: muchas llegan por un enlace')).toBeTruthy()
  })

  it('a listing whose record is not built yet says so — no endless spinner (break-it web #3)', () => {
    renderPage()
    hooks.listing = { data: null, loading: false, missing: true }
    fireEvent.change(screen.getByLabelText('Propiedad'), { target: { value: 'L2' } })
    expect(screen.getByText('Todavía estamos preparando los números de esta propiedad. Vuelve en unos minutos.')).toBeTruthy()
  })

  it('picking a listing narrows Tu cartera to it (break-it web #8)', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Propiedad'), { target: { value: 'L1' } })
    const portfolio = screen.getByTestId('analytics-portfolio')
    expect(within(portfolio).queryAllByText('Casa L2')).toHaveLength(0)
  })

  it('says when the numbers were built (break-it web #7)', () => {
    const data = pageData()
    data.builtAt = new Date('2026-11-20T09:05:00Z') // 4:05 a. m. Lima
    hooks.owner = { status: 'ready', data, refreshing: false }
    renderPage()
    expect(screen.getByText(/actualizado el 20 nov a las 4:05 a\. m\./)).toBeTruthy()
  })

  it('an older record missing sections does not crash the page (break-it web #9)', () => {
    const data = pageData()
    const old = thinBlock() as unknown as Record<string, unknown>
    delete old.heat
    delete old.marks
    delete old.sources
    data.periods['30'] = old as unknown as Block
    data.listings = data.listings.map((l) => ({ ...l, saves: undefined as unknown as number, seen: undefined as unknown as number[] }))
    hooks.owner = { status: 'ready', data, refreshing: false }
    renderPage()
    expect(screen.getByTestId('analytics-heat')).toBeTruthy()
    expect(within(screen.getByTestId('analytics-cards')).queryByText('NaN')).toBeNull()
  })

  it('totals missing a field and a page missing its listings do not crash (break-it web 2 #1)', () => {
    const data = pageData()
    data.periods['30'] = thinBlock({ totals: { shown: 5, seen: 2, contacts: 0 } as unknown as Block['totals'] })
    hooks.owner = { status: 'ready', data, refreshing: false }
    renderPage()
    expect(screen.getByTestId('analytics-funnel')).toBeTruthy()
  })

  it('listings with the same name can be told apart in the picker (break-it web 2 #2)', () => {
    const data = pageData()
    data.listings = [listing('L1', { name: 'Departamento en Castilla', sub: 'Venta · 3 hab. · 95 m²' }), listing('L2', { name: 'Departamento en Castilla', sub: 'Venta · 2 hab. · 70 m²' }), listing('L3', { name: 'Departamento en Castilla', sub: 'Venta · 2 hab. · 70 m²' })]
    hooks.owner = { status: 'ready', data, refreshing: false }
    renderPage()
    const options = [...(screen.getByLabelText('Propiedad') as HTMLSelectElement).options].map((o) => o.textContent)
    expect(new Set(options).size).toBe(options.length)
    expect(options).toContain('Departamento en Castilla · Venta · 3 hab. · 95 m²')
  })

  it('an owner with no listings is invited to publish', () => {
    hooks.owner = { status: 'none' }
    renderPage()
    expect(screen.getByText('Cuando publiques una propiedad, aquí verás cómo le va.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Publicar' }).getAttribute('href')).toBe('/app/listings/new')
  })
})
