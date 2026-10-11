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

import ContentGuard from '../ContentGuard'
import { PEOPLE } from '@/app/features/access/people'
import { isMarketingMemberEmail } from '@/app/features/team/teamRoster'

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/app/contenido']}>
      <Routes>
        <Route
          path="/app/contenido"
          element={
            <ContentGuard>
              <div data-testid="content-calendar">Contenido</div>
            </ContentGuard>
          }
        />
        <Route path="/app" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ContentGuard', () => {
  beforeEach(() => {
    mockAuthState.user = null
    mockAuthState.isLoading = true
    mockAuthState.isInitialized = false
  })

  describe('loading state', () => {
    it('shows spinner when not initialized', () => {
      renderWithRouter()
      expect(screen.getByTestId('spinner')).toBeDefined()
      expect(screen.queryByTestId('content-calendar')).toBeNull()
    })

    it('shows spinner when isLoading is true even if isInitialized is true', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = true
      mockAuthState.user = { email: 'admin@oqupa.com' }
      renderWithRouter()
      expect(screen.getByTestId('spinner')).toBeDefined()
      expect(screen.queryByTestId('content-calendar')).toBeNull()
    })
  })

  describe('users not on the marketing access list', () => {
    it('redirects to /app for a dev-only team member', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      // Use a dev-only person from the PEOPLE list
      const devOnly = PEOPLE.find(
        (p) => p.access.includes('dev') && !p.access.includes('marketing')
      )
      mockAuthState.user = { email: devOnly!.email }
      renderWithRouter()
      expect(screen.queryByTestId('content-calendar')).toBeNull()
      expect(screen.getByTestId('dashboard')).toBeDefined()
    })

    it('redirects to /app for an arbitrary unknown email', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = { email: 'random@example.com' }
      renderWithRouter()
      expect(screen.queryByTestId('content-calendar')).toBeNull()
      expect(screen.getByTestId('dashboard')).toBeDefined()
    })

    it('redirects to /app when user is null (not logged in)', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = null
      renderWithRouter()
      expect(screen.queryByTestId('content-calendar')).toBeNull()
      expect(screen.getByTestId('dashboard')).toBeDefined()
    })
  })

  describe('users on the marketing access list', () => {
    it('renders children for admin@oqupa.com (has marketing access)', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      mockAuthState.user = { email: 'admin@oqupa.com' }
      renderWithRouter()
      expect(screen.getByTestId('content-calendar')).toBeDefined()
    })

    it('renders children for a marketing-only member', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      // Use the first person with marketing access but no admin access
      const marketingPerson = PEOPLE.find(
        (p) => p.access.includes('marketing') && !p.access.includes('admin')
      )
      mockAuthState.user = { email: marketingPerson!.email }
      renderWithRouter()
      expect(screen.getByTestId('content-calendar')).toBeDefined()
    })

    it('matches the marketing list case-insensitively', () => {
      mockAuthState.isInitialized = true
      mockAuthState.isLoading = false
      // becjanmor@gmail.com is a marketing member
      mockAuthState.user = { email: 'BecJanMor@Gmail.com' }
      renderWithRouter()
      expect(screen.getByTestId('content-calendar')).toBeDefined()
    })
  })

  describe('isMarketingMemberEmail helper', () => {
    it('accepts exactly the people granted marketing access, and nobody else', () => {
      for (const person of PEOPLE) {
        expect(isMarketingMemberEmail(person.email)).toBe(
          person.access.includes('marketing'),
        )
      }
      // Sanity: not everyone has marketing access
      expect(PEOPLE.some((p) => !p.access.includes('marketing'))).toBe(true)
    })

    it('returns false for non-marketing emails', () => {
      expect(isMarketingMemberEmail('user@example.com')).toBe(false)
    })

    it('returns false for undefined and null', () => {
      expect(isMarketingMemberEmail(undefined)).toBe(false)
      expect(isMarketingMemberEmail(null)).toBe(false)
    })

    it('lowercases email before matching', () => {
      expect(isMarketingMemberEmail('Admin@Oqupa.Com')).toBe(true)
    })
  })
})
