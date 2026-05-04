// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockAuthState = {
  user: null as { name?: string; isPhoneVerified: boolean } | null,
  firebaseUser: null as { uid: string; emailVerified: boolean } | null,
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

import VerifiedGuard from '../VerifiedGuard'

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/app/dashboard']}>
      <Routes>
        <Route
          path="/app/dashboard"
          element={
            <VerifiedGuard>
              <div data-testid="protected">Protected</div>
            </VerifiedGuard>
          }
        />
        <Route path="/app/verify" element={<div data-testid="verify-page">Verify</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('VerifiedGuard', () => {
  beforeEach(() => {
    mockAuthState.user = null
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

    it('shows spinner with size lg', () => {
      renderWithRouter()
      expect(screen.getByTestId('spinner').getAttribute('data-size')).toBe('lg')
    })
  })

  describe('mid-registration', () => {
    it('redirects to /app/verify when firebaseUser exists but Firestore doc has not loaded yet', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.firebaseUser = { uid: 'uid-123', emailVerified: true }
      mockAuthState.user = null
      renderWithRouter()
      expect(screen.queryByTestId('protected')).toBeNull()
      expect(screen.getByTestId('verify-page')).toBeDefined()
    })
  })

  describe('fully verified user', () => {
    it('renders children when email + name + phone are all verified', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.firebaseUser = { uid: 'uid-123', emailVerified: true }
      mockAuthState.user = { name: 'Juan', isPhoneVerified: true }
      renderWithRouter()
      expect(screen.getByTestId('protected')).toBeDefined()
      expect(screen.queryByTestId('verify-page')).toBeNull()
    })
  })

  describe('unverified user redirect', () => {
    it('redirects to /app/verify when email is not verified', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.firebaseUser = { uid: 'uid-123', emailVerified: false }
      mockAuthState.user = { name: 'Juan', isPhoneVerified: true }
      renderWithRouter()
      expect(screen.queryByTestId('protected')).toBeNull()
      expect(screen.getByTestId('verify-page')).toBeDefined()
    })

    it('redirects to /app/verify when user has no name', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.firebaseUser = { uid: 'uid-123', emailVerified: true }
      mockAuthState.user = { name: undefined, isPhoneVerified: true }
      renderWithRouter()
      expect(screen.queryByTestId('protected')).toBeNull()
      expect(screen.getByTestId('verify-page')).toBeDefined()
    })

    it('redirects to /app/verify when phone is not verified', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.firebaseUser = { uid: 'uid-123', emailVerified: true }
      mockAuthState.user = { name: 'Juan', isPhoneVerified: false }
      renderWithRouter()
      expect(screen.queryByTestId('protected')).toBeNull()
      expect(screen.getByTestId('verify-page')).toBeDefined()
    })
  })
})
