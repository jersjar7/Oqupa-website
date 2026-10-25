// @vitest-environment jsdom
// The visitor's Guardados page (Jerson, 2026-10-25): what they saved in this
// browser. Someone signed in goes to their own Guardados in their account.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import GuardadosPage from '../GuardadosPage'
import { useDeviceSavesStore } from '@/stores/deviceSavesStore'

const auth = vi.hoisted(() => ({ firebaseUser: null as unknown, user: null as unknown }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (sel: (s: typeof auth) => unknown) => sel(auth) }))
vi.mock('@/components/lists/SaveButton', () => ({ default: () => null }))
const loaded = vi.hoisted(() => ({ ids: [] as string[] }))
vi.mock('@/hooks/useListListings', async () => {
  const { mapListing } = await import('@/lib/map/__tests__/mapListingFixture')
  return { useListListings: (ids: string[]) => { loaded.ids = ids; const live = ids.filter((id) => !id.startsWith('gone')); return { items: live.map((id) => mapListing({ id, amount: 98000, currency: 'USD' })), isLoading: false, missingIds: ids.filter((id) => id.startsWith('gone')) } } }
})
vi.mock('@/hooks/useDocumentMeta', () => ({ useDocumentMeta: () => {} }))

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/guardados']}>
      <Routes>
        <Route path="/guardados" element={<GuardadosPage />} />
        <Route path="/app/lists" element={<p>guardados de la cuenta</p>} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => { auth.firebaseUser = null; useDeviceSavesStore.setState({ ids: [], nudgeOpen: false }) })

describe('GuardadosPage', () => {
  it('shows what the visitor saved in this browser', () => {
    useDeviceSavesStore.setState({ ids: ['a', 'b'], nudgeOpen: false })
    renderPage()
    expect(screen.getByRole('heading', { name: 'Guardados' })).toBeDefined()
    expect(loaded.ids).toEqual(['a', 'b'])
    expect(screen.getAllByText('US$ 98 mil')).toHaveLength(2)
  })
  it('nothing saved: says so and offers the map', () => {
    renderPage()
    expect(screen.getByText(/aún no tienes guardados/i)).toBeDefined()
    expect(screen.getByRole('link', { name: /explorar/i }).getAttribute('href')).toBe('/explorar')
  })
  it("someone signed in goes to their account's Guardados", () => {
    auth.firebaseUser = { uid: 'u', emailVerified: true }
    auth.user = { name: 'Ana', isPhoneVerified: true }
    renderPage()
    expect(screen.getByText('guardados de la cuenta')).toBeDefined()
  })
  // Hostile review: a deleted listing left an empty page with no way out.
  it('a listing that no longer exists is dropped from the saves', () => {
    useDeviceSavesStore.setState({ ids: ['a', 'gone1'], nudgeOpen: false })
    renderPage()
    expect(useDeviceSavesStore.getState().ids).toEqual(['a'])
  })
})
