// @vitest-environment jsdom
// The way back to Guardados from the header (Jerson, 2026-10-25): a heart.
// A visitor sees it once they have saved something; someone signed in always.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import GuardadosLink from '../GuardadosLink'
import { useDeviceSavesStore } from '@/stores/deviceSavesStore'

const auth = vi.hoisted(() => ({ firebaseUser: null as unknown }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (sel: (s: typeof auth) => unknown) => sel(auth) }))

const renderLink = () => render(<MemoryRouter><GuardadosLink /></MemoryRouter>)

beforeEach(() => { auth.firebaseUser = null; useDeviceSavesStore.setState({ ids: [], nudgeOpen: false }) })

describe('GuardadosLink', () => {
  it('a visitor with nothing saved: no heart', () => {
    renderLink()
    expect(screen.queryByRole('link', { name: 'Guardados' })).toBeNull()
  })
  it('a visitor who saved something: the heart, to their Guardados', () => {
    useDeviceSavesStore.setState({ ids: ['a'], nudgeOpen: false })
    renderLink()
    expect(screen.getByRole('link', { name: 'Guardados' }).getAttribute('href')).toBe('/guardados')
  })
  it('someone signed in: the heart, to the account’s Guardados', () => {
    auth.firebaseUser = { uid: 'u' }
    renderLink()
    expect(screen.getByRole('link', { name: 'Guardados' }).getAttribute('href')).toBe('/app/lists')
  })
})
