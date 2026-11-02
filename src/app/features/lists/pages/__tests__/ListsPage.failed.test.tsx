// @vitest-environment jsdom
// A refused or failed read is said, with REINTENTAR — it used to spin forever
// (audit 2026-11-02, B.2).
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ListsPage from '../ListsPage'

vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: () => {} }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (sel: (s: unknown) => unknown) => sel({ firebaseUser: { uid: 'u' } }) }))
vi.mock('@/stores/listStore', () => ({
  useListStore: Object.assign((sel: (s: unknown) => unknown) => sel({ lists: [], isLoading: false, loadFailed: true }), {
    getState: () => ({ initialize: vi.fn() }),
  }),
}))
vi.mock('@/services/listService', () => ({ listService: {} }))

describe('ListsPage — failed read', () => {
  it('says so and offers Reintentar', () => {
    render(<MemoryRouter><ListsPage /></MemoryRouter>)
    expect(screen.getByText('No pudimos cargar tus guardados. Vuelve a intentarlo.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })
})
