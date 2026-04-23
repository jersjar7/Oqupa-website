// @vitest-environment jsdom
/**
 * Guard the accept-invitation toast's "Ver en Asignadas" action. A typo in
 * the target URL would leave agents clicking a broken link right after they
 * accept — low-probability but very user-facing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

// Capture what sonner receives
type ToastAction = { label: string; onClick: () => void }
let lastToast: { message: string; options: { action?: ToastAction } } | null = null
vi.mock('sonner', () => ({
  toast: {
    success: (message: string, options: { action?: ToastAction } = {}) => {
      lastToast = { message, options }
    },
    error: () => {},
  },
}))

// Track navigate() calls without real routing
const navigateMock = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>()
  return { ...orig, useNavigate: () => navigateMock }
})

// Service mock — resolve immediately so onSuccess fires
const acceptAssignmentMock = vi.fn()
vi.mock('@/services/firestoreService', () => ({
  firestoreService: {
    acceptAssignment: (id: string) => acceptAssignmentMock(id),
  },
}))

// Auth store only needs to be importable for the module
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector?: (s: unknown) => unknown) => {
    const state = { user: { id: 'u1' }, firebaseUser: { uid: 'u1' } }
    return selector ? selector(state) : state
  },
}))

// Firebase side-effect mocks
vi.mock('firebase/firestore', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>()
  return { ...orig, doc: () => ({}), getFirestore: () => ({}) }
})
vi.mock('@/lib/firebase', () => ({ db: {}, auth: {} }))

const { useAcceptAssignment } = await import('../useRealtorLeads')

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return React.createElement(
    QueryClientProvider, { client: queryClient },
    React.createElement(MemoryRouter, null, children),
  )
}

describe('useAcceptAssignment toast navigation', () => {
  beforeEach(() => {
    lastToast = null
    navigateMock.mockReset()
    acceptAssignmentMock.mockReset()
    acceptAssignmentMock.mockResolvedValue(undefined)
  })

  it('shows the success toast with a "Ver en Asignadas" action pointing to Mis Propiedades', async () => {
    const { result } = renderHook(() => useAcceptAssignment(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('listing-1')
    })

    expect(acceptAssignmentMock).toHaveBeenCalledWith('listing-1')
    expect(lastToast).not.toBeNull()
    expect(lastToast!.message).toContain('Invitación aceptada')
    expect(lastToast!.options.action).toBeDefined()
    expect(lastToast!.options.action!.label).toBe('Ver en Asignadas')
  })

  it('the toast action navigates to /app/listings?tab=asignadas', async () => {
    const { result } = renderHook(() => useAcceptAssignment(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('listing-1')
    })

    // Fire the action button click
    lastToast!.options.action!.onClick()
    expect(navigateMock).toHaveBeenCalledWith('/app/listings?tab=asignadas')
  })
})
