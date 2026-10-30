// Ported from the app's test/features/listings/unit/map_list_logic_test.dart
// (map plan step 3, ADR-031 items 5 and 7–11). Jerson's words, his order.
import { describe, it, expect } from 'vitest'
import {
  listingsInsideBounds, listButtonLabel, LIST_BACK_TO_MAP_LABEL, listHeader, LIST_SORTS,
  emptyListTitle, EMPTY_LIST_ZOOM_OUT_HINT, emptyListOtherOperation, listingDetailsLine,
  listingLocationLine, sortListingsForList,
} from '../listLogic'
import { DEFAULT_PEN_PER_USD } from '../exchangeRates'
import { mapListing } from './mapListingFixture'
import type { ListingWithProperty } from '@/types/explore'

const ids = (l: ListingWithProperty[]) => l.map((i) => i.listing.id)

describe('what the list contains', () => {
  const box = { south: -5.3, west: -80.7, north: -5.1, east: -80.5 }
  it('exactly the listings inside the visible map area', () => {
    const items = [
      mapListing({ id: 'in', lat: -5.2, lng: -80.6 }),
      mapListing({ id: 'out', lat: -4.9, lng: -80.6 }),
      mapListing({ id: 'edge', lat: -5.1, lng: -80.5 }),
    ]
    expect(ids(listingsInsideBounds(items, box))).toEqual(['in', 'edge'])
  })
  it('an approximate listing counts where the map draws it (its public point)', () => {
    const l = mapListing({ id: 'm', exact: false, lat: -5.2, lng: -80.6 })
    l.property.location.latitude = -4.0 // the private point is never on the public record; the map uses the display point
    expect(ids(listingsInsideBounds([l], box))).toEqual(['m'])
  })
  it('nothing on the map, nothing in the list', () => {
    expect(listingsInsideBounds([], box)).toEqual([])
  })
})

describe('the words', () => {
  it('the button', () => {
    expect(listButtonLabel(9, true)).toBe('VER LISTA · 9 en venta')
    expect(listButtonLabel(3, false)).toBe('VER LISTA · 3 en alquiler')
    expect(LIST_BACK_TO_MAP_LABEL).toBe('VER MAPA')
  })
  it('the header is the count and nothing else', () => {
    expect(listHeader(9, true)).toBe('9 en venta aquí')
    expect(listHeader(1, false)).toBe('1 en alquiler aquí')
  })
  it("the sort options, in Jerson's words and order", () => {
    expect(LIST_SORTS.map((s) => s.label)).toEqual([
      'Recomendados',
      'Nuevos en el mercado',
      'Precio: de menos a más',
      'Precio: de más a menos',
      'Más grandes primero (m²)',
    ])
  })
  it('the empty state', () => {
    expect(emptyListTitle(true)).toBe('Aquí no hay propiedades en venta')
    expect(emptyListTitle(false)).toBe('Aquí no hay propiedades en alquiler')
    expect(EMPTY_LIST_ZOOM_OUT_HINT).toBe('Vuelve al mapa y aléjalo con dos dedos para ver más lugares.')
    expect(emptyListOtherOperation(4, false)).toBe('O mira las 4 en alquiler que sí hay aquí.')
    expect(emptyListOtherOperation(1, true)).toBe('O mira la 1 en venta que sí hay aquí.')
    expect(emptyListOtherOperation(0, true)).toBeNull()
  })
})

describe('the details line, per type', () => {
  it('casa: dormitorios · baños · m²', () => {
    expect(listingDetailsLine(mapListing({ bedrooms: 3, bathrooms: 2, area: 160 }))).toBe('3 dormitorios · 2 baños · 160 m²')
    expect(listingDetailsLine(mapListing({ bedrooms: 1, bathrooms: 1, area: 45 }))).toBe('1 dormitorio · 1 baño · 45 m²')
  })
  it('departamento leaves out what is missing', () => {
    expect(listingDetailsLine(mapListing({ type: 'departamento', bedrooms: 2, area: 70 }))).toBe('2 dormitorios · 70 m²')
  })
  it('terreno, local, oficina: m² only', () => {
    for (const t of ['terreno', 'local', 'oficina'] as const) {
      expect(listingDetailsLine(mapListing({ type: t, bedrooms: 2, bathrooms: 1, area: 300 })), t).toBe('300 m²')
    }
    expect(listingDetailsLine(mapListing({ type: 'terreno', area: 1250 }))).toBe('1,250 m²')
  })
  it('alojamiento and cuarto: what exists', () => {
    expect(listingDetailsLine(mapListing({ type: 'hospedaje', operation: 'alquiler', bedrooms: 1, bathrooms: 1, area: 40 }))).toBe('1 dormitorio · 1 baño · 40 m²')
    expect(listingDetailsLine(mapListing({ type: 'habitacion', operation: 'alquiler', area: 12 }))).toBe('12 m²')
  })
})

describe('the location line', () => {
  it('urbanización when given, plus the official district', () => {
    expect(listingLocationLine(mapListing({ urbanizacion: 'Urb. Los Ficus', distrito: 'CASTILLA ' }))).toBe('Urb. Los Ficus, Castilla')
  })
  it('district only, with the official spelling', () => {
    expect(listingLocationLine(mapListing({ distrito: '26 de Octubre' }))).toBe('Veintiséis de Octubre')
  })
  it('a name that is no district is shown as stored, trimmed', () => {
    expect(listingLocationLine(mapListing({ distrito: ' Chato ' }))).toBe('Chato')
  })
})

describe('sorting', () => {
  const d = (day: number) => new Date(Date.UTC(2026, 9, day))
  it('Recomendados: boosted first (higher level first), then newest', () => {
    const list = [
      mapListing({ id: 'old', publishedAt: d(1) }),
      mapListing({ id: 'new', publishedAt: d(20) }),
      mapListing({ id: 'b3', boosted: true, boostScore: 3, publishedAt: d(2) }),
      mapListing({ id: 'b2', boosted: true, boostScore: 2, publishedAt: d(25) }),
    ]
    expect(ids(sortListingsForList(list, 'recomendados', 7))).toEqual(['b3', 'b2', 'new', 'old'])
  })
  it('Recomendados: equally boosted listings share first place fairly across visits', () => {
    const tied = ['a', 'b', 'c', 'e'].map((id) => mapListing({ id, boosted: true, boostScore: 2, publishedAt: d(3) }))
    const firsts: Record<string, number> = {}
    for (let seed = 0; seed < 4000; seed++) {
      const first = ids(sortListingsForList(tied, 'recomendados', seed))[0]!
      firsts[first] = (firsts[first] ?? 0) + 1
    }
    expect(new Set(Object.keys(firsts))).toEqual(new Set(['a', 'b', 'c', 'e']))
    for (const n of Object.values(firsts)) {
      expect(n).toBeGreaterThanOrEqual(800)
      expect(n).toBeLessThanOrEqual(1200)
    }
  })
  it('Recomendados: the same visit always gives the same order', () => {
    const tied = ['a', 'b', 'c', 'e', 'f'].map((id) => mapListing({ id, boosted: true, boostScore: 2 }))
    const once = ids(sortListingsForList(tied, 'recomendados', 42))
    for (let i = 0; i < 5; i++) expect(ids(sortListingsForList([...tied].reverse(), 'recomendados', 42))).toEqual(once)
  })
  it('Nuevos en el mercado: newest first, boost ignored', () => {
    const list = [mapListing({ id: 'b', boosted: true, boostScore: 3, publishedAt: d(1) }), mapListing({ id: 'n', publishedAt: d(9) })]
    expect(ids(sortListingsForList(list, 'nuevos', 1))).toEqual(['n', 'b'])
  })
  it('Precio compares soles and dollars at the shared rate', () => {
    expect(DEFAULT_PEN_PER_USD).toBe(3.75)
    const list = [
      mapListing({ id: 'usd100k', amount: 100000, currency: 'USD' }),
      mapListing({ id: 'pen300k', amount: 300000, currency: 'PEN' }),
      mapListing({ id: 'pen400k', amount: 400000, currency: 'PEN' }),
    ]
    expect(ids(sortListingsForList(list, 'precioAsc', 1))).toEqual(['pen300k', 'usd100k', 'pen400k'])
    expect(ids(sortListingsForList(list, 'precioDesc', 1))).toEqual(['pen400k', 'usd100k', 'pen300k'])
  })
  it('Más grandes primero (m²): biggest first', () => {
    const list = [mapListing({ id: 'small', area: 90 }), mapListing({ id: 'mid', area: 160 }), mapListing({ id: 'big', type: 'terreno', area: 500 })]
    expect(ids(sortListingsForList(list, 'masGrandes', 1))).toEqual(['big', 'mid', 'small'])
  })
})
