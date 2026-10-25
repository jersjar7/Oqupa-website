// @vitest-environment jsdom
// The card after a visitor's third save (Jerson, 2026-10-25): exactly
// "No pierdas tus guardados. Crea una cuenta", CREAR CUENTA and an × — no other
// words. Never for someone signed in.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import SaveNudge from '../SaveNudge'
import { useDeviceSavesStore } from '@/stores/deviceSavesStore'

const auth = vi.hoisted(() => ({ firebaseUser: null as unknown, user: null as unknown }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (sel: (s: typeof auth) => unknown) => sel(auth) }))

function renderAt(path = '/explorar') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SaveNudge />
      <Routes>
        <Route path="/explorar" element={<p>mapa</p>} />
        <Route path="/app/register" element={<p>crear cuenta</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  localStorage.clear()
  auth.firebaseUser = null
  useDeviceSavesStore.setState({ ids: ['a', 'b', 'c'], nudgeOpen: true })
})

describe('SaveNudge', () => {
  it('the line, one button and a close — nothing else', () => {
    renderAt()
    const card = screen.getByRole('dialog')
    expect(card.querySelector('p')!.textContent).toBe('No pierdas tus guardados. Crea una cuenta')
    const buttons = [...card.querySelectorAll('button')].map((b) => b.textContent || b.getAttribute('aria-label'))
    expect(buttons).toEqual(['Crear cuenta', 'Cerrar'])
  })
  it('CREAR CUENTA goes to create an account and comes back here after', () => {
    renderAt()
    fireEvent.click(screen.getByRole('button', { name: /crear cuenta/i }))
    expect(screen.getByText('crear cuenta')).toBeDefined()
    expect(JSON.parse(localStorage.getItem('oqupa_returnUrl')!).url).toBe('/explorar')
    expect(useDeviceSavesStore.getState().nudgeOpen).toBe(false)
  })
  it('× closes it', () => {
    renderAt()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('a tap elsewhere closes it', async () => {
    renderAt()
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('never for someone signed in', () => {
    auth.firebaseUser = { uid: 'u', emailVerified: true }
    auth.user = { name: 'Ana', isPhoneVerified: true }
    renderAt()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
