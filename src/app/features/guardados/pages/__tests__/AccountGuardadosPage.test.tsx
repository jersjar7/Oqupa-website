// @vitest-environment jsdom
// The signed-in Guardados (ADR-046 #1): one flat list, like the app — the
// saved properties directly, each with its heart; no named lists. Carries over
// the audit's fixes (2026-11-02, B.2): a failed read and offline are said with
// REINTENTAR; a removed listing shows as unavailable with QUITAR.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const state = vi.hoisted(() => ({
  meta: null as unknown,
  store: { ids: [] as string[], isLoading: false, loadFailed: false },
  initialize: vi.fn(),
  loaded: { items: [] as unknown[], isLoading: false, missingIds: [] as string[], failedIds: [] as string[], retry: vi.fn() },
  askedFor: [] as string[],
  remove: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: state.toast }))
vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: (m: unknown) => { state.meta = m } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (sel: (s: unknown) => unknown) => sel({ firebaseUser: { uid: 'u' } }) }))
vi.mock('@/stores/favoritesStore', () => ({
  useFavoritesStore: Object.assign((sel: (s: unknown) => unknown) => sel(state.store), {
    getState: () => ({ initialize: state.initialize }),
  }),
}))
vi.mock('@/services/favoritesService', () => ({ favoritesService: { remove: (...a: unknown[]) => state.remove(...a) } }))
vi.mock('@/hooks/useListListings', () => ({ useListListings: (ids: string[]) => { state.askedFor = ids; return state.loaded } }))
vi.mock('@/components/explore/PropertyCard', () => ({ default: ({ item }: { item: { listing: { id: string } } }) => <div>CARD {item.listing.id}</div> }))

import AccountGuardadosPage from '../AccountGuardadosPage'

const renderPage = () => render(<MemoryRouter><AccountGuardadosPage /></MemoryRouter>)

beforeEach(() => {
  state.store = { ids: [], isLoading: false, loadFailed: false }
  state.loaded = { items: [], isLoading: false, missingIds: [], failedIds: [], retry: vi.fn() }
  state.remove.mockReset().mockResolvedValue(undefined)
  state.toast.success.mockReset()
  state.toast.error.mockReset()
  state.initialize.mockReset()
})

describe('AccountGuardadosPage', () => {
  it('"Guardados" once, from the panel; no second heading', () => {
    renderPage()
    expect(state.meta).toEqual({ title: 'Guardados' })
    expect(screen.queryByRole('heading', { name: 'Guardados' })).toBeNull()
  })

  it('the saved properties directly — no named lists, no "Nueva lista"', () => {
    state.store.ids = ['a', 'b']
    state.loaded = { ...state.loaded, items: [{ listing: { id: 'a' } }, { listing: { id: 'b' } }] }
    renderPage()
    expect(state.askedFor).toEqual(['a', 'b'])
    expect(screen.getByText('CARD a')).toBeTruthy()
    expect(screen.getByText('CARD b')).toBeTruthy()
    expect(screen.queryByText(/nueva lista/i)).toBeNull()
    expect(screen.queryByRole('link', { name: /^ver$/i })).toBeNull()
  })

  it('nothing saved: the one empty state, with the way to the map', () => {
    renderPage()
    expect(screen.getByText('Aún no tienes guardados')).toBeTruthy()
    expect(screen.getByText('Toca el corazón en las propiedades que te gusten')).toBeTruthy()
    expect(screen.getByRole('link', { name: /ver el mapa/i }).getAttribute('href')).toBe('/explorar')
  })

  it('a refused or failed read says so and offers Reintentar', () => {
    state.store.loadFailed = true
    renderPage()
    expect(screen.getByText('No pudimos cargar tus guardados. Vuelve a intentarlo.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(state.initialize).toHaveBeenCalledWith('u')
  })

  it('offline is not "empty": says so with Reintentar', () => {
    state.store.ids = ['a']
    state.loaded = { ...state.loaded, failedIds: ['a'] }
    renderPage()
    expect(screen.queryByText('Aún no tienes guardados')).toBeNull()
    expect(screen.getByText('Sin conexión. Revisa tu internet y vuelve a intentarlo.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(state.loaded.retry).toHaveBeenCalled()
  })

  it('a removed listing shows as unavailable, with QUITAR, in the app’s words', async () => {
    state.store.ids = ['gone']
    state.loaded = { ...state.loaded, missingIds: ['gone'] }
    renderPage()
    expect(screen.getByText('Esta propiedad ya no está disponible')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    await waitFor(() => expect(state.remove).toHaveBeenCalledWith('u', 'gone'))
    expect(state.toast.success).toHaveBeenCalledWith('Quitado de Guardados')
  })
})
