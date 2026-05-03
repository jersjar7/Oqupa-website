// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockAuthState = {
  user: null as { isVerifiedRealtor: boolean } | null,
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

import RealtorGuard from '../RealtorGuard'

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/app/leads']}>
      <Routes>
        <Route
          path="/app/leads"
          element={
            <RealtorGuard>
              <div data-testid="realtor-content">Leads</div>
            </RealtorGuard>
          }
        />
        <Route path="/app" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('RealtorGuard', () => {
  beforeEach(() => {
    mockAuthState.user = null
    mockAuthState.isLoading = true
    mockAuthState.isInitialized = false
  })

  describe('loading state', () => {
    it('shows spinner when not initialized', () => {
      renderWithRouter()
      expect(screen.getByTestId('spinner')).toBeDefined()
      expect(screen.queryByTestId('realtor-content')).toBeNull()
    })

    it('shows spinner with size lg', () => {
      renderWithRouter()
      expect(screen.getByTestId('spinner').getAttribute('data-size')).toBe('lg')
    })
  })

  describe('non-realtor users', () => {
    it('redirects to /app when user is null', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = null
      renderWithRouter()
      expect(screen.queryByTestId('realtor-content')).toBeNull()
      expect(screen.getByTestId('dashboard')).toBeDefined()
    })

    it('redirects to /app when isVerifiedRealtor is false', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = { isVerifiedRealtor: false }
      renderWithRouter()
      expect(screen.queryByTestId('realtor-content')).toBeNull()
      expect(screen.getByTestId('dashboard')).toBeDefined()
    })
  })

  describe('verified realtor', () => {
    it('renders children when isVerifiedRealtor is true', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = { isVerifiedRealtor: true }
      renderWithRouter()
      expect(screen.getByTestId('realtor-content')).toBeDefined()
      expect(screen.queryByTestId('dashboard')).toBeNull()
    })
  })
})
