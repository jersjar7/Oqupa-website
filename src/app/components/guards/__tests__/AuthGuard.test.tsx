// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

const mockAuthState = {
  firebaseUser: null as unknown,
  isLoading: true,
  isInitialized: false,
}

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => mockAuthState,
}))

vi.mock('@/app/components/ui', () => ({
  Spinner: ({ size }: { size: string }) => (
    <div data-testid="spinner" data-size={size} />
  ),
}))

import AuthGuard from '../AuthGuard'

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/app/dashboard']}>
      <Routes>
        <Route
          path="/app/dashboard"
          element={
            <AuthGuard>
              <div data-testid="protected">Protected</div>
            </AuthGuard>
          }
        />
        <Route path="/app/login" element={<div data-testid="login-page">Login</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AuthGuard', () => {
  beforeEach(() => {
    mockAuthState.firebaseUser = null
    mockAuthState.isLoading = true
    mockAuthState.isInitialized = false
  })

  describe('loading state', () => {
    it('shows spinner when not initialized', () => {
      renderWithRouter()
      expect(screen.getByTestId('spinner')).toBeDefined()
      expect(screen.queryByTestId('protected')).toBeNull()
    })

    it('shows spinner when initialized but still loading', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = true
      renderWithRouter()
      expect(screen.getByTestId('spinner')).toBeDefined()
    })

    it('shows spinner with size lg', () => {
      renderWithRouter()
      expect(screen.getByTestId('spinner').getAttribute('data-size')).toBe('lg')
    })
  })

  describe('unauthenticated user', () => {
    it('redirects to /app/login when no firebaseUser', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.firebaseUser = null
      renderWithRouter()
      expect(screen.queryByTestId('protected')).toBeNull()
      expect(screen.getByTestId('login-page')).toBeDefined()
    })
  })

  describe('authenticated user', () => {
    it('renders children when firebaseUser exists', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.firebaseUser = { uid: 'uid-123' }
      renderWithRouter()
      expect(screen.getByTestId('protected')).toBeDefined()
      expect(screen.queryByTestId('login-page')).toBeNull()
    })
  })
})

// "Cámbialo" (email sign-up fix): confirming the new email ends the session,
// and the guard is what notices first on the pipeline page. Found in the
// staging browser walk-through 2026-10-24 — the person landed on a bare
// sign-in screen with no word about the change.
describe('AuthGuard — after an email change', () => {
  function Where() {
    const l = useLocation()
    return <div data-testid="where">{l.pathname + l.search}</div>
  }
  function renderAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path={path} element={<AuthGuard><div>Protected</div></AuthGuard>} />
          <Route path="/app/login" element={<Where />} />
        </Routes>
      </MemoryRouter>
    )
  }
  beforeEach(() => {
    sessionStorage.clear()
    mockAuthState.firebaseUser = null
    mockAuthState.isLoading = false
    mockAuthState.isInitialized = true
  })

  it('the pipeline sends the person to sign in with the new email and the note', () => {
    sessionStorage.setItem('oqupa_email_change_v1', JSON.stringify({ email: 'bien@x.com', at: Date.now() }))
    renderAt('/app/verify')
    expect(screen.getByTestId('where').textContent).toBe('/app/login?correo=1&cambio=1&email=bien%40x.com')
  })

  it('without a pending change, it is the plain sign-in', () => {
    renderAt('/app/verify')
    expect(screen.getByTestId('where').textContent).toBe('/app/login')
  })

  it('other protected pages are unaffected by a pending change', () => {
    sessionStorage.setItem('oqupa_email_change_v1', JSON.stringify({ email: 'bien@x.com', at: Date.now() }))
    renderAt('/app/dashboard')
    expect(screen.getByTestId('where').textContent).toBe('/app/login')
  })
})
