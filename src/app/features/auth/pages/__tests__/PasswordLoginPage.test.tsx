// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockAuthService = vi.hoisted(() => ({
  getSignInMethods: vi.fn(),
  loginWithEmailAndPassword: vi.fn(),
  sendPasswordSetupEmail: vi.fn(),
}))

vi.mock('@/services/authService', () => ({
  authService: mockAuthService,
}))

vi.mock('@/lib/authErrors', () => ({
  getLoginAuthError: vi.fn(() => ({ message: 'Credenciales incorrectas' })),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/app/components/ui', () => ({
  Input: ({ label, error, revealToggle: _rt, ...props }: any) => (
    <>
      <input aria-label={label} {...props} />
      {error && <span role="alert">{error}</span>}
    </>
  ),
  Button: ({ children, isLoading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

// ── Import after mocks ──────────────────────────────────────────────────────

import PasswordLoginPage from '../PasswordLoginPage'

// ── Helpers ─────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <PasswordLoginPage />
    </MemoryRouter>
  )
}

function fillForm(email = 'test@example.com', password = 'password123') {
  fireEvent.change(screen.getByRole('textbox', { name: /correo/i }), {
    target: { value: email },
  })
  fireEvent.change(screen.getByLabelText(/contrase/i), {
    target: { value: password },
  })
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('PasswordLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthService.getSignInMethods.mockResolvedValue(['password'])
    mockAuthService.loginWithEmailAndPassword.mockResolvedValue(undefined)
  })

  describe('rendering', () => {
    it('renders email and password fields', () => {
      renderPage()
      expect(screen.getByRole('textbox', { name: /correo/i })).toBeDefined()
      expect(screen.getByLabelText(/contrase/i)).toBeDefined()
    })

    it('renders the submit button', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /iniciar/i })).toBeDefined()
    })

    it('renders forgot password link', () => {
      renderPage()
      // Page has two forgot-password links (one in accordion, one below form)
      expect(screen.getAllByRole('link', { name: /olvidaste/i }).length).toBeGreaterThan(0)
    })
  })

  describe('successful login', () => {
    it('calls loginWithEmailAndPassword with email and password', async () => {
      renderPage()
      fillForm()
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => {
        expect(mockAuthService.loginWithEmailAndPassword).toHaveBeenCalledWith(
          'test@example.com',
          'password123'
        )
      })
    })
  })

  describe('error handling', () => {
    it('shows error message on failed login', async () => {
      mockAuthService.loginWithEmailAndPassword.mockRejectedValue(
        new Error('auth/wrong-password')
      )
      renderPage()
      fillForm()
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => {
        expect(screen.getByText('Credenciales incorrectas')).toBeDefined()
      })
    })
  })

  describe('legacy magic-link accounts', () => {
    it('shows legacy notice for emailLink-only accounts', async () => {
      mockAuthService.getSignInMethods.mockResolvedValue(['emailLink'])
      mockAuthService.sendPasswordSetupEmail.mockResolvedValue(undefined)
      renderPage()
      fillForm()
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => {
        expect(mockAuthService.sendPasswordSetupEmail).toHaveBeenCalledWith(
          'test@example.com'
        )
        expect(screen.getByText(/Revisa tu bandeja/i)).toBeDefined()
      })
    })
  })
})
