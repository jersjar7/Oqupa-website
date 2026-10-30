// @vitest-environment jsdom
// Seen on staging 2026-10-25: the account's Guardados page said "Guardados"
// twice (the panel's title and the page's own heading) under a subtitle that
// restated it. The panel's title is enough; no subtitle.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ListsPage from '../ListsPage'

const meta = vi.hoisted(() => ({ last: null as unknown }))
vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: (m: unknown) => { meta.last = m } }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (sel: (s: unknown) => unknown) => sel({ firebaseUser: { uid: 'u' } }) }))
vi.mock('@/stores/listStore', () => ({ useListStore: (sel: (s: unknown) => unknown) => sel({ lists: [], isLoading: false }) }))
vi.mock('@/services/listService', () => ({ listService: {} }))

describe('ListsPage title', () => {
  it('"Guardados" once, from the panel; no subtitle; no second heading', () => {
    render(<MemoryRouter><ListsPage /></MemoryRouter>)
    expect(meta.last).toEqual({ title: 'Guardados' })
    expect(screen.queryByRole('heading', { name: 'Guardados' })).toBeNull()
    expect(screen.getByRole('button', { name: /nueva lista/i })).toBeDefined()
  })
})
