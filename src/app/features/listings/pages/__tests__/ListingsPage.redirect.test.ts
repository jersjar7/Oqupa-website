// @vitest-environment jsdom
/**
 * Guard the legacy `?tab=reclamadas` → `/app/leads?tab=en-espera` redirect.
 * A typo here would break dashboard deep-links from before the IA split.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

// ── Mocks — keep the render hermetic ───────────────────────────────────────
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector?: (s: unknown) => unknown) => {
    const state = { user: null, firebaseUser: null, isInitialized: true }
    return selector ? selector(state) : state
  },
}))

vi.mock('@/hooks/useListings', () => ({
  useUserListingsWithProperties: () => ({ data: [], isLoading: false, error: undefined }),
}))

vi.mock('@/hooks/useRealtorLeads', () => ({
  useAgentAssignments: () => ({ data: [], isLoading: false }),
}))

vi.mock('@/app/components/shell/pageMetaContext', () => ({
  useSetPageMeta: () => {},
}))

// Sonner toast is used transitively via imports
vi.mock('sonner', () => ({ toast: { success: () => {}, error: () => {} } }))

// Firebase mocks so import graph doesn't explode
vi.mock('firebase/firestore', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>()
  return { ...orig, doc: () => ({}), getFirestore: () => ({}) }
})
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }))

const { default: ListingsPage } = await import('../ListingsPage')

function Probe() {
  const loc = useLocation()
  return React.createElement('div', { 'data-testid': 'here' }, `${loc.pathname}${loc.search}`)
}

describe('ListingsPage legacy redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects /app/listings?tab=reclamadas to /app/leads?tab=en-espera', async () => {
    const { getByTestId } = render(
      React.createElement(MemoryRouter,
        { initialEntries: ['/app/listings?tab=reclamadas'] },
        React.createElement(Routes, null,
          React.createElement(Route, { path: '/app/listings', element: React.createElement(ListingsPage) }),
          React.createElement(Route, { path: '/app/leads', element: React.createElement(Probe) }),
        ),
      ),
    )

    await waitFor(() => {
      expect(getByTestId('here').textContent).toBe('/app/leads?tab=en-espera')
    })
  })

  it('does NOT redirect when tab=propias or tab=asignadas', async () => {
    const { queryByTestId } = render(
      React.createElement(MemoryRouter,
        { initialEntries: ['/app/listings?tab=asignadas'] },
        React.createElement(Routes, null,
          React.createElement(Route, { path: '/app/listings', element: React.createElement(ListingsPage) }),
          React.createElement(Route, { path: '/app/leads', element: React.createElement(Probe) }),
        ),
      ),
    )

    // Probe only mounts on /app/leads. If we wrongly redirected, it would appear.
    await new Promise((r) => setTimeout(r, 20))
    expect(queryByTestId('here')).toBeNull()
  })
})
