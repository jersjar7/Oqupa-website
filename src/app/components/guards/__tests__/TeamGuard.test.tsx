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
  columnEmailFor,
  isTeamMemberEmail,
  membersOf,
  teamsFor,
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
    mockAuthState.user = { email: 'SarahSweetPie6@Gmail.com' }
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

  it('reports the boards a person belongs to', () => {
    expect(teamsFor('ktquint@byu.edu')).toEqual(['dev'])
    expect(teamsFor('becjanmor@gmail.com')).toEqual(['marketing'])
    expect(teamsFor('admin@oqupa.com')).toEqual(['dev', 'marketing'])
    expect(teamsFor('nobody@example.com')).toEqual([])
  })

  it('renders one column per person, not per email alias', () => {
    const devNames = membersOf('dev').map((m) => m.name)
    expect(devNames).toEqual([...new Set(devNames)])
    expect(devNames).toContain('Jerson')
    expect(devNames).toContain('Sarah')
    expect(devNames).toContain('Kenny')
  })

  it('excludes people who are not on the requested board', () => {
    expect(membersOf('dev').map((m) => m.name)).not.toContain('Becca')
    expect(membersOf('marketing').map((m) => m.name)).not.toContain('Sarah')
  })

  it('collapses a person\'s alias addresses onto one column', () => {
    // Jerson can sign in as either account; both must land in the same column
    // or work assigned under one address would be invisible in the other.
    expect(columnEmailFor('jersondevs@gmail.com')).toBe(columnEmailFor('admin@oqupa.com'))
    expect(columnEmailFor('nobody@example.com')).toBeNull()
  })

  it('gives every column email a matching roster entry', () => {
    for (const team of ['dev', 'marketing'] as const) {
      for (const member of membersOf(team)) {
        expect(columnEmailFor(member.email)).toBe(member.email)
      }
    }
  })
})
