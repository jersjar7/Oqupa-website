// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>()
  return { ...mod, useNavigate: () => mockNavigate }
})

const mockAuthState = vi.hoisted(() => ({
  user: null as { name?: string; isPhoneVerified?: boolean } | null,
  firebaseUser: null as
    | { uid: string; email?: string | null; emailVerified?: boolean }
    | null,
  refreshUser: vi.fn(),
  refreshFirebaseUser: vi.fn(),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => mockAuthState,
}))

const mockAuthService = vi.hoisted(() => ({
  updateUserName: vi.fn(),
  sendPhoneVerificationCode: vi.fn(),
  verifyPhoneCode: vi.fn(),
  updateUserContactInfo: vi.fn(),
  initializeRecaptcha: vi.fn(),
  cleanupRecaptcha: vi.fn(),
  sendEmailVerificationToCurrentUser: vi.fn(),
}))

vi.mock('@/services/authService', () => ({
  authService: mockAuthService,
}))

vi.mock('@/lib/utils', () => ({
  consumeReturnUrl: vi.fn(() => null),
}))

vi.mock('@/lib/authErrors', () => ({
  getPhoneAuthError: vi.fn(() => ({ message: 'Error de telefono', recoveryHint: null })),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

vi.mock('@/app/components/ui', () => ({
  Input: ({ label, error, ...props }: any) => (
    <>
      <input aria-label={label} {...props} />
      {error && <span role="alert">{error}</span>}
    </>
  ),
  Button: ({ children, isLoading, disabled, ...props }: any) => (
    <button disabled={disabled} {...props}>{children}</button>
  ),
}))

// ── Import after mocks ──────────────────────────────────────────────────────

import AuthPipelinePage from '../AuthPipelinePage'

// ── Helpers ─────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/verify']}>
      <Routes>
        <Route path="/app/verify" element={<AuthPipelinePage />} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('AuthPipelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthState.user = null
    // Default fixture: signed-in with email already verified, so existing
    // tests focus on the name/phone/code steps. The email-verify step has
    // its own describe block below.
    mockAuthState.firebaseUser = {
      uid: 'uid-123',
      email: 'test@example.com',
      emailVerified: true,
    }
    mockAuthState.refreshUser.mockResolvedValue(undefined)
    mockAuthState.refreshFirebaseUser.mockResolvedValue({
      uid: 'uid-123',
      email: 'test@example.com',
      emailVerified: true,
    })
  })

  describe('redirects', () => {
    it('redirects to /app/login when no firebaseUser', async () => {
      mockAuthState.firebaseUser = null
      renderPage()
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/app/login')
      })
    })

    it('redirects to /app when user is already fully verified', async () => {
      mockAuthState.user = { name: 'Juan', isPhoneVerified: true }
      renderPage()
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/app')
      })
    })
  })

  describe('email-verify step', () => {
    beforeEach(() => {
      mockAuthState.firebaseUser = {
        uid: 'uid-123',
        email: 'new@example.com',
        emailVerified: false,
      }
    })

    it('shows email-verify step first when email is unverified', () => {
      renderPage()
      expect(screen.getByText(/verifica tu correo/i)).toBeDefined()
    })

    it('renders the user email in the body copy', () => {
      renderPage()
      expect(screen.getByText('new@example.com')).toBeDefined()
    })

    it('shows step 1 of 4 progress on the email step', () => {
      renderPage()
      expect(screen.getByText(/paso 1 de 4/i)).toBeDefined()
    })

    it('does not show the name step while email is unverified', () => {
      renderPage()
      expect(screen.queryByText(/cómo te llamas/i)).toBeNull()
    })

    it('calls sendEmailVerificationToCurrentUser when "Reenviar correo" is clicked', async () => {
      mockAuthService.sendEmailVerificationToCurrentUser.mockResolvedValue(undefined)
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /reenviar correo/i }))
      await waitFor(() => {
        expect(mockAuthService.sendEmailVerificationToCurrentUser).toHaveBeenCalled()
      })
    })

    it('advances to name step when "Ya verifique" finds emailVerified=true', async () => {
      mockAuthState.refreshFirebaseUser.mockResolvedValueOnce({
        uid: 'uid-123',
        email: 'new@example.com',
        emailVerified: true,
      })
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /ya verifiqué/i }))
      await waitFor(() => {
        expect(screen.getByText(/cómo te llamas/i)).toBeDefined()
      })
    })

    it('shows error and stays on step when "Ya verifique" still finds emailVerified=false', async () => {
      mockAuthState.refreshFirebaseUser.mockResolvedValueOnce({
        uid: 'uid-123',
        email: 'new@example.com',
        emailVerified: false,
      })
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /ya verifiqué/i }))
      await waitFor(() => {
        expect(screen.getByText(/aún no detectamos/i)).toBeDefined()
      })
      expect(screen.getByText(/verifica tu correo/i)).toBeDefined()
    })
  })

  describe('name step', () => {
    it('shows name step when email is verified and user has no name', () => {
      mockAuthState.user = null
      renderPage()
      expect(screen.getByText(/cómo te llamas/i)).toBeDefined()
    })

    it('shows name input field', () => {
      mockAuthState.user = null
      renderPage()
      expect(screen.getByLabelText(/nombre/i)).toBeDefined()
    })

    it('shows step 2 of 4 progress', () => {
      mockAuthState.user = null
      renderPage()
      expect(screen.getByText(/paso 2 de 4/i)).toBeDefined()
    })
  })

  describe('phone step', () => {
    it('shows phone step when user has name but phone is not verified', () => {
      mockAuthState.user = { name: 'Juan', isPhoneVerified: false }
      renderPage()
      expect(screen.getByText(/número de tel/i)).toBeDefined()
    })

    it('shows "verify later" skip button', () => {
      mockAuthState.user = { name: 'Juan', isPhoneVerified: false }
      renderPage()
      expect(screen.getByRole('button', { name: /verificar después/i })).toBeDefined()
    })

    it('initializes reCAPTCHA when entering phone step', () => {
      mockAuthState.user = { name: 'Juan', isPhoneVerified: false }
      renderPage()
      expect(mockAuthService.initializeRecaptcha).toHaveBeenCalledWith('recaptcha-container')
    })
  })

  describe('cleanup', () => {
    it('cleans up reCAPTCHA on unmount', () => {
      mockAuthState.user = null
      const { unmount } = renderPage()
      unmount()
      expect(mockAuthService.cleanupRecaptcha).toHaveBeenCalled()
    })
  })
})
