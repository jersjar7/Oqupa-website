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

import MetricsGuard, { isMetricsAllowedEmail } from '../MetricsGuard'
import { PEOPLE } from '@/app/features/access/people'

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/app/numbers']}>
      <Routes>
        <Route
          path="/app/numbers"
          element={
            <MetricsGuard>
              <div data-testid="metrics-content">Metrics</div>
            </MetricsGuard>
          }
        />
        <Route path="/app" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('MetricsGuard', () => {
  beforeEach(() => {
    mockAuthState.user = null
    mockAuthState.isLoading = true
    mockAuthState.isInitialized = false
  })

  describe('loading state', () => {
    it('shows spinner when not initialized', () => {
      renderWithRouter()
      expect(screen.getByTestId('spinner')).toBeDefined()
      expect(screen.queryByTestId('metrics-content')).toBeNull()
    })
  })

  describe('users not on the allowlist', () => {
    it('redirects to /app for arbitrary email', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = { email: 'user@example.com' }
      renderWithRouter()
      expect(screen.queryByTestId('metrics-content')).toBeNull()
      expect(screen.getByTestId('dashboard')).toBeDefined()
    })

    it('redirects to /app when user is null', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = null
      renderWithRouter()
      expect(screen.queryByTestId('metrics-content')).toBeNull()
      expect(screen.getByTestId('dashboard')).toBeDefined()
    })
  })

  describe('users on the allowlist', () => {
    it('renders children for admin@oqupa.com', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = { email: 'admin@oqupa.com' }
      renderWithRouter()
      expect(screen.getByTestId('metrics-content')).toBeDefined()
    })

    it('renders children for an allowlisted gmail account', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = { email: 'libardo.pico26@gmail.com' }
      renderWithRouter()
      expect(screen.getByTestId('metrics-content')).toBeDefined()
    })

    it('matches the allowlist case-insensitively', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = { email: 'BecJanMor@Gmail.com' }
      renderWithRouter()
      expect(screen.getByTestId('metrics-content')).toBeDefined()
    })
  })

  describe('isMetricsAllowedEmail helper', () => {
    it('accepts exactly the people granted metrics, and nobody else', () => {
      // Derived from the single access list rather than a second copy of the
      // emails — hardcoding them here would be the very duplication this
      // refactor removed, and would disagree the next time someone changes.
      for (const person of PEOPLE) {
        expect(isMetricsAllowedEmail(person.email)).toBe(
          person.access.includes('metrics'),
        )
      }
      // Stops the assertion above passing vacuously if everyone had metrics.
      expect(PEOPLE.some((p) => !p.access.includes('metrics'))).toBe(true)
    })

    it('returns false for non-allowlisted emails', () => {
      expect(isMetricsAllowedEmail('user@example.com')).toBe(false)
      expect(isMetricsAllowedEmail('other@oqupa.com')).toBe(false)
    })

    it('returns false for undefined / null', () => {
      expect(isMetricsAllowedEmail(undefined)).toBe(false)
      expect(isMetricsAllowedEmail(null)).toBe(false)
    })

    it('lowercases email before matching', () => {
      expect(isMetricsAllowedEmail('Admin@Oqupa.com')).toBe(true)
      expect(isMetricsAllowedEmail('LiBardo.Pico26@Gmail.com')).toBe(true)
    })
  })
})
