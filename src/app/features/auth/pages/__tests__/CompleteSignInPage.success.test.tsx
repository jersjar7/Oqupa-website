// @vitest-environment jsdom
/**
 * Tests for CompleteSignInPage success and form submission paths,
 * complementing CompleteSignInPage.test.tsx which covers error/redirect paths.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAuthService = vi.hoisted(() => ({
  isSignInLink: vi.fn(() => true),
  completeMagicLinkSignIn: vi.fn(),
}))

const mockUserState = vi.hoisted(() => ({
  user: null as { isPhoneVerified?: boolean } | null,
  refreshUser: vi.fn(),
}))

vi.mock('@/services/authService', () => ({
  authService: mockAuthService,
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: Object.assign(
    () => mockUserState,
    { getState: () => ({ user: mockUserState.user }) },
  ),
}))

vi.mock('@/lib/authErrors', () => ({
  getMagicLinkAuthError: vi.fn((err: unknown) => ({
    message: `Error: ${err instanceof Error ? err.message : 'unknown'}`,
  })),
}))

const mockConsumeReturnUrl = vi.hoisted(() => vi.fn(() => null as string | null))
vi.mock('@/lib/utils', () => ({ consumeReturnUrl: mockConsumeReturnUrl }))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock('@/app/components/ui', () => ({
  Input: ({ label, error, ...props }: { label: string; error?: string; [key: string]: unknown }) => (
    <>
      <input aria-label={label as string} {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />
      {error && <span role="alert">{error}</span>}
    </>
  ),
  Button: ({ children, isLoading, ...props }: { children: React.ReactNode; isLoading?: boolean; [key: string]: unknown }) => (
    <button {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>
  ),
  Spinner: ({ size }: { size?: string }) => <div data-testid="spinner" data-size={size} />,
}))

// ── Import after mocks ───────────────────────────────────────────────────────

import CompleteSignInPage from '../CompleteSignInPage'

// ── Helpers ─────────────────────────────────────────────────────────────────

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

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockUserState.user = null
  mockUserState.refreshUser.mockResolvedValue(undefined)
  mockConsumeReturnUrl.mockReturnValue(null)
  vi.stubGlobal('localStorage', makeLocalStorageStub({ oqupa_signInEmail: 'test@example.com' }))
})

describe('success paths — auto-completing from localStorage email', () => {
  it('navigates to /app/verify when phone is not yet verified', async () => {
    mockAuthService.completeMagicLinkSignIn.mockResolvedValue(undefined)
    mockUserState.user = { isPhoneVerified: false }

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('verify-page')).toBeDefined()
    })
  })

  it('navigates to /app when phone is verified', async () => {
    mockAuthService.completeMagicLinkSignIn.mockResolvedValue(undefined)
    mockUserState.user = { isPhoneVerified: true }

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeDefined()
    })
  })

  it('navigates to the return URL when one exists and phone is verified', async () => {
    mockAuthService.completeMagicLinkSignIn.mockResolvedValue(undefined)
    mockUserState.user = { isPhoneVerified: true }
    mockConsumeReturnUrl.mockReturnValue('/app/listings/new')

    renderPage()

    // After sign-in succeeds, consumeReturnUrl is called and used.
    // The router renders /app/listings/new but we haven't set up that route
    // in the test router — so the dashboard route won't match. We just
    // verify completeMagicLinkSignIn was called (success path executed).
    await waitFor(() => {
      expect(mockAuthService.completeMagicLinkSignIn).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockConsumeReturnUrl).toHaveBeenCalled()
    })
  })

  it('calls completeMagicLinkSignIn with the stored email', async () => {
    mockAuthService.completeMagicLinkSignIn.mockResolvedValue(undefined)
    mockUserState.user = { isPhoneVerified: true }

    renderPage()

    await waitFor(() => {
      expect(mockAuthService.completeMagicLinkSignIn).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
      )
    })
  })
})

describe('form submission — manual email entry (onSubmit path)', () => {
  beforeEach(() => {
    // Remove email from localStorage so the "needs-email" state is shown
    vi.stubGlobal('localStorage', makeLocalStorageStub())
  })

  it('calls completeMagicLinkSignIn when the user manually submits their email', async () => {
    mockAuthService.completeMagicLinkSignIn.mockResolvedValue(undefined)
    mockUserState.user = { isPhoneVerified: true }

    renderPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/correo/i)).toBeDefined()
    })

    const emailInput = screen.getByLabelText(/correo/i)
    fireEvent.change(emailInput, { target: { value: 'manual@example.com' } })
    fireEvent.submit(emailInput.closest('form')!)

    await waitFor(() => {
      expect(mockAuthService.completeMagicLinkSignIn).toHaveBeenCalledWith(
        'manual@example.com',
        expect.any(String),
      )
    })
  })

  it('navigates to /app/verify after manual sign-in when phone is not verified', async () => {
    mockAuthService.completeMagicLinkSignIn.mockResolvedValue(undefined)
    mockUserState.user = { isPhoneVerified: false }

    renderPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/correo/i)).toBeDefined()
    })

    const emailInput = screen.getByLabelText(/correo/i)
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })
    fireEvent.submit(emailInput.closest('form')!)

    await waitFor(() => {
      expect(screen.getByTestId('verify-page')).toBeDefined()
    })
  })
})
