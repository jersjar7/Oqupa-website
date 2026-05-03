// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockAuthState = {
  user: null as { email?: string } | null,
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

import AdminGuard, { isAdminEmail } from '../AdminGuard'

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/app/admin']}>
      <Routes>
        <Route
          path="/app/admin"
          element={
            <AdminGuard>
              <div data-testid="admin-content">Admin</div>
            </AdminGuard>
          }
        />
        <Route path="/app" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('AdminGuard', () => {
  beforeEach(() => {
    mockAuthState.user = null
    mockAuthState.isLoading = true
    mockAuthState.isInitialized = false
  })

  describe('loading state', () => {
    it('shows spinner when not initialized', () => {
      renderWithRouter()
      expect(screen.getByTestId('spinner')).toBeDefined()
      expect(screen.queryByTestId('admin-content')).toBeNull()
    })

    it('shows spinner with size lg', () => {
      renderWithRouter()
      expect(screen.getByTestId('spinner').getAttribute('data-size')).toBe('lg')
    })
  })

  describe('non-admin users', () => {
    it('redirects to /app when user has non-admin email', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = { email: 'user@example.com' }
      renderWithRouter()
      expect(screen.queryByTestId('admin-content')).toBeNull()
      expect(screen.getByTestId('dashboard')).toBeDefined()
    })

    it('redirects to /app when user is null', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = null
      renderWithRouter()
      expect(screen.queryByTestId('admin-content')).toBeNull()
      expect(screen.getByTestId('dashboard')).toBeDefined()
    })
  })

  describe('admin users', () => {
    it('renders children for admin@oqupa.com', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = { email: 'admin@oqupa.com' }
      renderWithRouter()
      expect(screen.getByTestId('admin-content')).toBeDefined()
    })

    it('renders children for bbarba@oqupa.com', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = { email: 'bbarba@oqupa.com' }
      renderWithRouter()
      expect(screen.getByTestId('admin-content')).toBeDefined()
    })
  })

  describe('isAdminEmail helper', () => {
    it('returns true for admin@oqupa.com', () => {
      expect(isAdminEmail('admin@oqupa.com')).toBe(true)
    })

    it('returns true for bbarba@oqupa.com', () => {
      expect(isAdminEmail('bbarba@oqupa.com')).toBe(true)
    })

    it('returns false for non-admin emails', () => {
      expect(isAdminEmail('user@example.com')).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isAdminEmail(undefined)).toBe(false)
    })
  })
})
