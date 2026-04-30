// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>()
  return { ...mod, useNavigate: () => mockNavigate }
})

const mockAuthState = vi.hoisted(() => ({
  user: null as { name?: string; isPhoneVerified?: boolean } | null,
  firebaseUser: null as { uid: string } | null,
  refreshUser: vi.fn(),
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
    mockAuthState.firebaseUser = { uid: 'uid-123' }
    mockAuthState.refreshUser.mockResolvedValue(undefined)
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

  describe('name step', () => {
    it('shows name step when user has no name', () => {
      mockAuthState.user = null
      renderPage()
      expect(screen.getByText(/como te llamas/i)).toBeDefined()
    })

    it('shows name input field', () => {
      mockAuthState.user = null
      renderPage()
      expect(screen.getByLabelText(/nombre/i)).toBeDefined()
    })

    it('shows step 1 of 3 progress', () => {
      mockAuthState.user = null
      renderPage()
      expect(screen.getByText(/paso 1 de 3/i)).toBeDefined()
    })
  })

  describe('phone step', () => {
    it('shows phone step when user has name but phone is not verified', () => {
      mockAuthState.user = { name: 'Juan', isPhoneVerified: false }
      renderPage()
      expect(screen.getByText(/numero de tel/i)).toBeDefined()
    })

    it('shows "verify later" skip button', () => {
      mockAuthState.user = { name: 'Juan', isPhoneVerified: false }
      renderPage()
      expect(screen.getByRole('button', { name: /verificar despu/i })).toBeDefined()
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
