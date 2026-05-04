// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ── Mocks ───────────────────────────────────────────────────────────────────

// Mock auth store with controllable state
const mockAuthState = {
  firebaseUser: null as { uid: string; emailVerified: boolean } | null,
  user: null as { name?: string; isPhoneVerified: boolean } | null,
  isLoading: true,
  isInitialized: false,
}

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => mockAuthState,
}))

vi.mock('@/app/components/ui', () => ({
  Spinner: ({ size }: { size: string }) => (
    <div data-testid="spinner" data-size={size}>Loading...</div>
  ),
}))

const mockConsumeReturnUrl = vi.fn<() => string | null>(() => null)
vi.mock('@/lib/utils', () => ({
  consumeReturnUrl: () => mockConsumeReturnUrl(),
}))

// ── Import after mocks ──────────────────────────────────────────────────────

import GuestGuard from '../GuestGuard'

// ── Helpers ─────────────────────────────────────────────────────────────────

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/app/login"
          element={
            <GuestGuard>
              <div data-testid="login-page">Login Page</div>
            </GuestGuard>
          }
        />
        <Route path="/app" element={<div data-testid="dashboard">Dashboard</div>} />
        <Route path="/app/verify" element={<div data-testid="verify">Verify</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('GuestGuard', () => {
  beforeEach(() => {
    mockAuthState.firebaseUser = null
    mockAuthState.user = null
    mockAuthState.isLoading = true
    mockAuthState.isInitialized = false
    mockConsumeReturnUrl.mockReturnValue(null)
  })

  // ── Loading state ───────────────────────────────────────────────────────

  describe('loading state', () => {
    it('shows spinner when not initialized', () => {
      mockAuthState.isInitialized = false
      mockAuthState.isLoading = true

      renderWithRouter('/app/login')

      expect(screen.getByTestId('spinner')).toBeDefined()
      expect(screen.queryByTestId('login-page')).toBeNull()
    })

    it('shows spinner when initialized but still loading', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = true

      renderWithRouter('/app/login')

      expect(screen.getByTestId('spinner')).toBeDefined()
      expect(screen.queryByTestId('login-page')).toBeNull()
    })

    it('shows spinner with size lg', () => {
      mockAuthState.isInitialized = false
      mockAuthState.isLoading = true

      renderWithRouter('/app/login')

      expect(screen.getByTestId('spinner').getAttribute('data-size')).toBe('lg')
    })
  })

  // ── Guest (unauthenticated) ─────────────────────────────────────────────

  describe('unauthenticated user (guest)', () => {
    it('renders children when user is not authenticated', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.firebaseUser = null

      renderWithRouter('/app/login')

      expect(screen.getByTestId('login-page')).toBeDefined()
      expect(screen.queryByTestId('spinner')).toBeNull()
    })
  })

  // ── Authenticated user redirect ─────────────────────────────────────────

  describe('authenticated user redirect', () => {
    it('redirects fully verified user to /app', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.firebaseUser = { uid: 'uid-123', emailVerified: true }
      mockAuthState.user = { name: 'Juan', isPhoneVerified: true }

      renderWithRouter('/app/login')

      expect(screen.queryByTestId('login-page')).toBeNull()
      expect(screen.getByTestId('dashboard')).toBeDefined()
    })

    it('redirects user with unverified phone to /app/verify', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.firebaseUser = { uid: 'uid-123', emailVerified: true }
      mockAuthState.user = { name: 'Juan', isPhoneVerified: false }

      renderWithRouter('/app/login')

      expect(screen.queryByTestId('login-page')).toBeNull()
      expect(screen.getByTestId('verify')).toBeDefined()
    })

    it('redirects user with unverified email to /app/verify', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.firebaseUser = { uid: 'uid-123', emailVerified: false }
      mockAuthState.user = { name: 'Juan', isPhoneVerified: true }

      renderWithRouter('/app/login')

      expect(screen.queryByTestId('login-page')).toBeNull()
      expect(screen.getByTestId('verify')).toBeDefined()
    })

    it('redirects to /app/verify when user doc is null (mid-registration)', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.firebaseUser = { uid: 'uid-123', emailVerified: false }
      mockAuthState.user = null // no Firestore doc yet

      renderWithRouter('/app/login')

      expect(screen.queryByTestId('login-page')).toBeNull()
      expect(screen.getByTestId('verify')).toBeDefined()
    })

    it('redirects to stored return URL when available', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.firebaseUser = { uid: 'uid-123', emailVerified: true }
      mockAuthState.user = { name: 'Juan', isPhoneVerified: true }
      mockConsumeReturnUrl.mockReturnValueOnce('/app')

      renderWithRouter('/app/login')

      // Should consume the return URL and redirect there
      expect(mockConsumeReturnUrl).toHaveBeenCalled()
      expect(screen.getByTestId('dashboard')).toBeDefined()
    })
  })

  // ── Cross-tab scenario simulation ───────────────────────────────────────

  describe('cross-tab auth persistence', () => {
    it('shows login page (not spinner) when auth is fully resolved with no user', () => {
      // This is the key scenario: a new tab where authStateReady has
      // resolved and confirmed there is NO persisted session.
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.firebaseUser = null
      mockAuthState.user = null

      renderWithRouter('/app/login')

      expect(screen.getByTestId('login-page')).toBeDefined()
      expect(screen.queryByTestId('spinner')).toBeNull()
    })

    it('never shows login page when auth resolves with a persisted user', () => {
      // This is the core fix: a new tab where authStateReady resolved
      // and found a persisted session from IndexedDB. The GuestGuard
      // should redirect immediately, never showing the login form.
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.firebaseUser = { uid: 'persisted-uid', emailVerified: true }
      mockAuthState.user = { name: 'Juan', isPhoneVerified: true }

      renderWithRouter('/app/login')

      expect(screen.queryByTestId('login-page')).toBeNull()
      expect(screen.getByTestId('dashboard')).toBeDefined()
    })
  })
})
