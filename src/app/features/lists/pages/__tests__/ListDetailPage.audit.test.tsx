// @vitest-environment jsdom
// A list's page (audit 2026-11-02, B.2): offline is not "empty"; a removed
// listing shows as unavailable with QUITAR, as in the app; the app's words
// when removing.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const state = vi.hoisted(() => ({
  loaded: { items: [] as unknown[], isLoading: false, missingIds: [] as string[], failedIds: [] as string[], retry: vi.fn() },
  remove: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: state.toast }))
vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: () => {} }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (sel: (s: unknown) => unknown) => sel({ firebaseUser: { uid: 'u' } }) }))
vi.mock('@/stores/listStore', () => ({
  useListStore: (sel: (s: unknown) => unknown) => sel({ lists: [{ id: 'L', name: 'Favoritos', listingIds: ['a', 'gone'] }] }),
}))
vi.mock('@/services/listService', () => ({ listService: { removeListing: (...a: unknown[]) => state.remove(...a) } }))
vi.mock('@/hooks/useListListings', () => ({ useListListings: () => state.loaded }))
vi.mock('@/components/explore/PropertyCard', () => ({ default: () => <div>CARD</div> }))

import ListDetailPage from '../ListDetailPage'

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/app/lists/L']}>
      <Routes><Route path="/app/lists/:listId" element={<ListDetailPage />} /></Routes>
    </MemoryRouter>,
  )

describe('ListDetailPage', () => {
  beforeEach(() => {
    state.loaded = { items: [], isLoading: false, missingIds: [], failedIds: [], retry: vi.fn() }
    state.remove.mockReset().mockResolvedValue(undefined)
    state.toast.success.mockReset()
  })

  it('offline is not "empty": says so with Reintentar', () => {
    state.loaded = { ...state.loaded, failedIds: ['a', 'gone'] }
    renderPage()
    expect(screen.queryByText('Esta lista está vacía')).toBeNull()
    expect(screen.getByText('Sin conexión. Revisa tu internet y vuelve a intentarlo.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(state.loaded.retry).toHaveBeenCalled()
  })

  it('a removed listing shows as unavailable, with QUITAR', async () => {
    state.loaded = { ...state.loaded, missingIds: ['gone'] }
    renderPage()
    expect(screen.getByText('Esta propiedad ya no está disponible')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    await waitFor(() => expect(state.remove).toHaveBeenCalledWith('u', 'L', 'gone'))
    expect(state.toast.success).toHaveBeenCalledWith('Quitado de Guardados')
  })
})
