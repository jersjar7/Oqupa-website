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
  isMarketingMemberEmail,
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
  it('grants the dev board only to dev-team members, not to everyone on the roster', () => {
    // This used to assert that EVERY roster email passed. That was the weakness:
    // adding one marketing person would silently have handed them the developer
    // board. Access is per board.
    for (const member of TEAM_MEMBERS) {
      expect(isTeamMemberEmail(member.email)).toBe(member.teams.includes('dev'))
    }
    // And the roster must actually contain someone who is NOT on dev, or this
    // test passes vacuously and the protection is untested.
    expect(TEAM_MEMBERS.some((m) => !m.teams.includes('dev'))).toBe(true)

    expect(isTeamMemberEmail('nobody@example.com')).toBe(false)
    expect(isTeamMemberEmail(undefined)).toBe(false)
    expect(isTeamMemberEmail(null)).toBe(false)
  })

  it('grants the marketing calendar only to marketing-team members', () => {
    for (const member of TEAM_MEMBERS) {
      expect(isMarketingMemberEmail(member.email)).toBe(
        member.teams.includes('marketing'),
      )
    }
    expect(isMarketingMemberEmail('nobody@example.com')).toBe(false)
    expect(isMarketingMemberEmail(undefined)).toBe(false)
    expect(isMarketingMemberEmail(null)).toBe(false)
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

  it('keeps the two boards separate', () => {
    const dev = membersOf('dev').map((m) => m.email)
    const marketing = membersOf('marketing').map((m) => m.email)

    expect(dev.length).toBeGreaterThan(0)
    expect(marketing.length).toBeGreaterThan(0)

    // Someone must be on marketing and NOT on dev, otherwise the separation is
    // untested and a regression would go unnoticed.
    expect(marketing.some((e) => !dev.includes(e))).toBe(true)
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
