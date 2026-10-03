// @vitest-environment jsdom
// Button audit, 2026-10-03: the "Crear" button disabled itself while a list
// was being created, but pressing Enter in the name field called the same
// handler with no check — so Enter twice made TWO lists. Same for rename.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockListService = vi.hoisted(() => ({
  createList: vi.fn(),
  renameList: vi.fn(),
  deleteList: vi.fn(),
}))
vi.mock('@/services/listService', () => ({ listService: mockListService }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (sel: (s: unknown) => unknown) => sel({ firebaseUser: { uid: 'u1' } }),
}))
vi.mock('@/stores/listStore', () => ({
  useListStore: (sel: (s: unknown) => unknown) =>
    sel({ lists: [{ id: 'l1', name: 'Favoritas', listingIds: [] }], isLoading: false }),
}))
vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: () => {} }))
vi.mock('@/app/components/ui', () => ({ Spinner: () => <span>cargando</span> }))

import ListsPage from '../ListsPage'

describe('ListsPage — Enter while saving', () => {
  beforeEach(() => vi.clearAllMocks())

  it('pressing Enter twice while a list is being created makes one list', async () => {
    mockListService.createList.mockReturnValue(new Promise(() => {}))
    render(<MemoryRouter><ListsPage /></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: /nueva lista/i }))
    const field = screen.getByLabelText('Nombre de la lista')
    fireEvent.change(field, { target: { value: 'Playa' } })
    await act(async () => {
      fireEvent.keyDown(field, { key: 'Enter' })
    })
    await act(async () => {
      fireEvent.keyDown(field, { key: 'Enter' })
    })

    expect(mockListService.createList).toHaveBeenCalledTimes(1)
  })
})
