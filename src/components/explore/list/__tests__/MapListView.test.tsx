// @vitest-environment jsdom
// The list of what the map shows (map plan steps 3–4, ADR-031): the count and
// the sort button on one line and nothing else above the cards; Jerson's sort
// words; the empty state that helps. Mirrors the app's map_list_view_test.dart.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MapListView from '../MapListView'
import ListToggleButton from '../ListToggleButton'
import { mapListing } from '@/lib/map/__tests__/mapListingFixture'

vi.mock('@/components/lists/SaveButton', () => ({ default: () => null }))
// The visit's exchange rate (ADR-031 item 19): no network in tests. Starts at the
// fixed default; the "live" answer is set per test.
const rate = vi.hoisted(() => ({ live: 3.75 }))
vi.mock('@/lib/map/exchangeRates', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/map/exchangeRates')>()),
  penPerUsdRightNow: () => 3.75,
  penPerUsdForThisVisit: () => Promise.resolve(rate.live),
}))

function renderList(props: Partial<React.ComponentProps<typeof MapListView>> = {}) {
  return render(
    <MemoryRouter>
      <MapListView
        items={[]}
        isVenta
        sessionSeed={1}
        otherOperationCount={0}
        onSwitchOperation={() => {}}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('MapListView', () => {
  it('the header is the count and the sort button — nothing else', () => {
    renderList({ items: [mapListing({ id: 'a' }), mapListing({ id: 'b' })] })
    const header = screen.getByTestId('map-list-header')
    expect(within(header).getByText('2 en venta aquí')).toBeDefined()
    expect(within(header).getByRole('button', { name: /recomendados/i })).toBeDefined()
    expect(header.textContent).not.toMatch(/lo mismo que ves|mapa/i)
  })

  it('each card: type word, price, details for that type, location', () => {
    renderList({ items: [mapListing({ id: 't', type: 'terreno', area: 300, amount: 45000, distrito: 'CASTILLA ', urbanizacion: 'Urb. Los Ficus' })] })
    expect(screen.getByText('TERRENO')).toBeDefined()
    expect(screen.getByText('US$ 45 mil')).toBeDefined()
    expect(screen.getByText('300 m²')).toBeDefined()
    expect(screen.getByText('Urb. Los Ficus, Castilla')).toBeDefined()
  })

  it('rent cards say "al mes" / "la noche"', () => {
    renderList({
      isVenta: false,
      items: [
        mapListing({ id: 'm', operation: 'alquiler', type: 'departamento', amount: 1200, currency: 'PEN' }),
        mapListing({ id: 'n', operation: 'alquiler', rental: 'shortTerm', type: 'hospedaje', amount: 120, currency: 'PEN' }),
      ],
    })
    expect(screen.getByText('S/. 1,200 al mes')).toBeDefined()
    expect(screen.getByText('S/. 120 la noche')).toBeDefined()
    expect(screen.getByText('2 en alquiler aquí')).toBeDefined()
  })

  it('boosted cards say DESTACADO and come first', () => {
    renderList({ items: [mapListing({ id: 'plain', amount: 50000 }), mapListing({ id: 'boost', boosted: true, boostScore: 2, amount: 70000 })] })
    const cards = screen.getAllByTestId('listing-list-card')
    expect(cards[0]!.textContent).toContain('DESTACADO')
    expect(cards[0]!.textContent).toContain('US$ 70 mil')
    expect(cards[1]!.textContent).not.toContain('DESTACADO')
  })

  it('a card with photos shows the photo count', () => {
    renderList({ items: [mapListing({ id: 'p', photos: 8 })] })
    expect(screen.getByText('1 / 8')).toBeDefined()
  })

  it('the sort sheet: the five options in Jerson\'s words; picking one re-orders', () => {
    renderList({
      items: [
        mapListing({ id: 'cheap', amount: 30000, publishedAt: new Date('2026-10-20') }),
        mapListing({ id: 'dear', amount: 300000, publishedAt: new Date('2026-10-01') }),
      ],
    })
    fireEvent.click(screen.getByRole('button', { name: /recomendados/i }))
    const sheet = screen.getByRole('dialog', { name: 'Ordenar' })
    expect(within(sheet).getAllByRole('button').map((b) => b.textContent?.replace('✓', '').trim())).toEqual([
      'Recomendados', 'Nuevos en el mercado', 'Precio: de menos a más', 'Precio: de más a menos', 'Más grandes primero (m²)',
    ])
    fireEvent.click(within(sheet).getByRole('button', { name: /de más a menos/ }))
    expect(screen.queryByRole('dialog', { name: 'Ordenar' })).toBeNull()
    expect(screen.getAllByTestId('listing-list-card')[0]!.textContent).toContain('US$ 300 mil')
    expect(screen.getByRole('button', { name: /de más a menos/ })).toBeDefined()
  })

  // ADR-031 item 19: price sorts compare soles and dollars at the live rate.
  // At the old fixed 3.75, US$ 100 (= S/. 375) sorted above S/. 360; at the real
  // 3.44 (2026-10-24) it is S/. 344 and comes first.
  it('price sorts use the live exchange rate once it arrives', async () => {
    rate.live = 3.44
    renderList({
      items: [
        mapListing({ id: 'soles', amount: 360, currency: 'PEN', operation: 'alquiler' }),
        mapListing({ id: 'dolares', amount: 100, currency: 'USD', operation: 'alquiler' }),
      ],
      isVenta: false,
    })
    fireEvent.click(screen.getByRole('button', { name: /recomendados/i }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Ordenar' })).getByRole('button', { name: /de menos a más/ }))
    await waitFor(() => expect(screen.getAllByTestId('listing-list-card')[0]!.textContent).toContain('US$'))
    rate.live = 3.75
  })

  it('the empty state helps: zoom out, and the other operation when it has some here', () => {
    // A phone: zooming out is two fingers.
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
    const onSwitch = vi.fn()
    renderList({ items: [], otherOperationCount: 4, onSwitchOperation: onSwitch })
    expect(screen.getByText('Aquí no hay propiedades en venta')).toBeDefined()
    expect(screen.getByText('Vuelve al mapa y aléjalo con dos dedos para ver más lugares.')).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'O mira las 4 en alquiler que sí hay aquí.' }))
    expect(onSwitch).toHaveBeenCalledOnce()
    vi.unstubAllGlobals()
  })

  it('on a computer the empty state names the mouse wheel and the − button, not fingers', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} }))
    renderList({ items: [], otherOperationCount: 0 })
    expect(screen.getByText('Vuelve al mapa y aléjalo con la rueda del mouse o el botón − para ver más lugares.')).toBeDefined()
    expect(screen.queryByText(/dos dedos/)).toBeNull()
    vi.unstubAllGlobals()
  })

  it('the empty state without an offer when the other operation has none', () => {
    renderList({ items: [], otherOperationCount: 0 })
    expect(screen.queryByText(/O mira/)).toBeNull()
  })
})

describe('ListToggleButton', () => {
  it('VER LISTA with the count, or VER MAPA', () => {
    const onClick = vi.fn()
    const { rerender } = render(<ListToggleButton mode="map" count={9} isVenta onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'VER LISTA · 9 en venta' }))
    expect(onClick).toHaveBeenCalledOnce()
    rerender(<ListToggleButton mode="list" count={9} isVenta onClick={onClick} />)
    expect(screen.getByRole('button', { name: 'VER MAPA' })).toBeDefined()
    rerender(<ListToggleButton mode="map" count={3} isVenta={false} onClick={onClick} />)
    expect(screen.getByRole('button', { name: 'VER LISTA · 3 en alquiler' })).toBeDefined()
  })
})
