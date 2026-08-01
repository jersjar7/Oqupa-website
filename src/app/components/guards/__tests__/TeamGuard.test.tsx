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

import TeamGuard from '../TeamGuard'
import {
  TEAM_MEMBERS,
  isTeamMemberEmail,
  memberFor,
  membersOf,
} from '@/app/features/team/teamRoster'

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={['/app/equipo']}>
      <Routes>
        <Route
          path="/app/equipo"
          element={
            <TeamGuard>
              <div data-testid="team-content">Board</div>
            </TeamGuard>
          }
        />
        <Route path="/app" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('TeamGuard', () => {
  beforeEach(() => {
    mockAuthState.user = null
    mockAuthState.isLoading = true
    mockAuthState.isInitialized = false
  })

  it('shows spinner while auth is still initializing', () => {
    renderWithRouter()
    expect(screen.getByTestId('spinner')).toBeDefined()
    expect(screen.queryByTestId('team-content')).toBeNull()
  })

  it('redirects a non-roster user to /app', () => {
    mockAuthState.isInitialized = true
    mockAuthState.isLoading = false
    mockAuthState.user = { email: 'user@example.com' }
    renderWithRouter()
    expect(screen.queryByTestId('team-content')).toBeNull()
    expect(screen.getByTestId('dashboard')).toBeDefined()
  })

  it('redirects when there is no signed-in user', () => {
    mockAuthState.isInitialized = true
    mockAuthState.isLoading = false
    mockAuthState.user = null
    renderWithRouter()
    expect(screen.getByTestId('dashboard')).toBeDefined()
  })

  it('renders the board for a roster member', () => {
    mockAuthState.isInitialized = true
    mockAuthState.isLoading = false
    mockAuthState.user = { email: 'admin@oqupa.com' }
    renderWithRouter()
    expect(screen.getByTestId('team-content')).toBeDefined()
  })

  it('matches the roster case-insensitively', () => {
    mockAuthState.isInitialized = true
    mockAuthState.isLoading = false
    mockAuthState.user = { email: 'SarahWalkerDev@Gmail.com' }
    renderWithRouter()
    expect(screen.getByTestId('team-content')).toBeDefined()
  })
})

describe('teamRoster', () => {
  it('accepts every roster email and rejects everything else', () => {
    for (const member of TEAM_MEMBERS) {
      expect(isTeamMemberEmail(member.email)).toBe(true)
    }
    expect(isTeamMemberEmail('nobody@example.com')).toBe(false)
    expect(isTeamMemberEmail(undefined)).toBe(false)
    expect(isTeamMemberEmail(null)).toBe(false)
  })

  it('stores every roster email in lowercase so matching can normalize', () => {
    for (const member of TEAM_MEMBERS) {
      expect(member.email).toBe(member.email.toLowerCase())
    }
  })

  it('is exactly the four developers, in column order', () => {
    expect(membersOf('dev').map((m) => m.name)).toEqual([
      'Jerson',
      'Sarah',
      'Kenny',
      'Sam',
    ])
    expect(membersOf('dev').map((m) => m.email)).toEqual([
      'admin@oqupa.com',
      'sarahwalkerdev@gmail.com',
      'kennethtquintana@gmail.com',
      'samuelsotointernational@gmail.com',
    ])
  })

  it('has no second board yet', () => {
    expect(membersOf('marketing')).toEqual([])
  })

  it('resolves an email to its roster entry', () => {
    expect(memberFor('KennethTQuintana@Gmail.com')?.name).toBe('Kenny')
    expect(memberFor('nobody@example.com')).toBeNull()
    expect(memberFor(undefined)).toBeNull()
  })

  it('gives every member a distinct column', () => {
    const emails = membersOf('dev').map((m) => m.email)
    expect(emails).toEqual([...new Set(emails)])
  })
})
