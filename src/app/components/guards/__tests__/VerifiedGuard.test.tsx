// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockAuthState = {
  user: null as { name?: string; isPhoneVerified: boolean } | null,
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

  describe('no user (mid-registration)', () => {
    it('renders children when user doc is null', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = null
      renderWithRouter()
      expect(screen.getByTestId('protected')).toBeDefined()
    })
  })

  describe('fully verified user', () => {
    it('renders children when user has name and phone verified', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = { name: 'Juan', isPhoneVerified: true }
      renderWithRouter()
      expect(screen.getByTestId('protected')).toBeDefined()
      expect(screen.queryByTestId('verify-page')).toBeNull()
    })
  })

  describe('unverified user redirect', () => {
    it('redirects to /app/verify when user has no name', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = { name: undefined, isPhoneVerified: true }
      renderWithRouter()
      expect(screen.queryByTestId('protected')).toBeNull()
      expect(screen.getByTestId('verify-page')).toBeDefined()
    })

    it('redirects to /app/verify when phone is not verified', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = { name: 'Juan', isPhoneVerified: false }
      renderWithRouter()
      expect(screen.queryByTestId('protected')).toBeNull()
      expect(screen.getByTestId('verify-page')).toBeDefined()
    })
  })
})
