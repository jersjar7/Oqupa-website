// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockAuthService = vi.hoisted(() => ({
  isSignInLink: vi.fn(),
  completeMagicLinkSignIn: vi.fn(),
}))

const mockAuthStore = vi.hoisted(() => ({
  refreshUser: vi.fn(),
}))

vi.mock('@/services/authService', () => ({
  authService: mockAuthService,
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(() => mockAuthStore, {
    getState: () => ({ user: null }),
  }),
}))

vi.mock('@/lib/authErrors', () => ({
  getMagicLinkAuthError: vi.fn(() => ({ message: 'Enlace no valido' })),
}))

vi.mock('@/lib/utils', () => ({
  consumeReturnUrl: vi.fn(() => null),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/app/components/ui', () => ({
  Input: ({ label, error, ...props }: any) => (
    <>
      <input aria-label={label} {...props} />
      {error && <span role="alert">{error}</span>}
    </>
  ),
  Button: ({ children, isLoading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Spinner: ({ size }: any) => <div data-testid="spinner" data-size={size} />,
}))

// ── Import after mocks ──────────────────────────────────────────────────────

import CompleteSignInPage from '../CompleteSignInPage'

// ── Helpers ─────────────────────────────────────────────────────────────────

// Stub localStorage with a controllable in-memory map
function makeLocalStorageStub(initial: Record<string, string> = {}) {
  const store = { ...initial }
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
  }
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/complete-signin']}>
      <Routes>
        <Route path="/app/complete-signin" element={<CompleteSignInPage />} />
        <Route path="/app/login" element={<div data-testid="login-page">Login</div>} />
        <Route path="/app/verify" element={<div data-testid="verify-page">Verify</div>} />
        <Route path="/app" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('CompleteSignInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthStore.refreshUser.mockResolvedValue(undefined)
    vi.stubGlobal('localStorage', makeLocalStorageStub())
  })

  describe('initial state', () => {
    it('shows spinner while completing sign-in', () => {
      vi.stubGlobal('localStorage', makeLocalStorageStub({ oqupa_signInEmail: 'test@example.com' }))
      mockAuthService.isSignInLink.mockReturnValue(true)
      mockAuthService.completeMagicLinkSignIn.mockReturnValue(new Promise(() => {}))
      renderPage()
      expect(screen.getByTestId('spinner')).toBeDefined()
    })
  })

  describe('invalid sign-in link', () => {
    it('redirects to /app/login if URL is not a sign-in link', async () => {
      mockAuthService.isSignInLink.mockReturnValue(false)
      renderPage()
      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeDefined()
      })
    })
  })

  describe('email confirmation required', () => {
    it('shows email form when email is not in localStorage', async () => {
      mockAuthService.isSignInLink.mockReturnValue(true)
      renderPage()
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /correo/i })).toBeDefined()
      })
    })
  })

  describe('error state', () => {
    it('shows error state when sign-in completion fails', async () => {
      vi.stubGlobal('localStorage', makeLocalStorageStub({ oqupa_signInEmail: 'test@example.com' }))
      mockAuthService.isSignInLink.mockReturnValue(true)
      mockAuthService.completeMagicLinkSignIn.mockRejectedValue(
        new Error('invalid-action-code')
      )
      renderPage()
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /enlace no v/i })).toBeDefined()
      })
    })
  })
})
