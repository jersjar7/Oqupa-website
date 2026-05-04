// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>()
  return { ...mod, useNavigate: () => mockNavigate }
})

const mockAuthService = vi.hoisted(() => ({
  registerWithEmailAndPassword: vi.fn(),
  sendEmailVerificationToCurrentUser: vi.fn(),
}))

vi.mock('@/services/authService', () => ({
  authService: mockAuthService,
}))

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock('sonner', () => ({ toast: mockToast }))

vi.mock('@/lib/authErrors', () => ({
  getRegisterAuthError: vi.fn((err: unknown) => {
    const code = err && typeof err === 'object' && 'code' in err
      ? (err as { code: string }).code
      : ''
    if (code === 'auth/email-already-in-use') {
      return { message: 'Ya existe una cuenta con ese correo. Inicia sesión en su lugar.', isRetryable: false }
    }
    if (code === 'auth/weak-password') {
      return { message: 'La contraseña es muy débil. Usa al menos 6 caracteres.', isRetryable: true }
    }
    return { message: 'No pudimos crear tu cuenta. Intenta de nuevo.', isRetryable: true }
  }),
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

import RegisterPage from '../RegisterPage'

// ── Helpers ─────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  )
}

function fillForm({
  email = 'new@example.com',
  password = 'password123',
  confirmPassword = 'password123',
}: {
  email?: string
  password?: string
  confirmPassword?: string
} = {}) {
  fireEvent.change(screen.getByRole('textbox', { name: /correo/i }), {
    target: { value: email },
  })
  fireEvent.change(screen.getByLabelText(/^contraseña$/i), {
    target: { value: password },
  })
  fireEvent.change(screen.getByLabelText(/confirma la contraseña/i), {
    target: { value: confirmPassword },
  })
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthService.registerWithEmailAndPassword.mockResolvedValue({
      uid: 'uid-123',
    })
    mockAuthService.sendEmailVerificationToCurrentUser.mockResolvedValue(undefined)
  })

  describe('rendering', () => {
    it('renders email, password and confirmPassword fields', () => {
      renderPage()
      expect(screen.getByRole('textbox', { name: /correo/i })).toBeDefined()
      expect(screen.getByLabelText(/^contraseña$/i)).toBeDefined()
      expect(screen.getByLabelText(/confirma la contraseña/i)).toBeDefined()
    })

    it('renders the submit button', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /crear cuenta/i })).toBeDefined()
    })

    it('renders a link back to login for users who already have an account', () => {
      renderPage()
      const link = screen.getByRole('link', { name: /inicia sesión/i })
      expect(link.getAttribute('href')).toBe('/app/login')
    })

    it('renders terms and privacy links', () => {
      renderPage()
      expect(screen.getByRole('link', { name: /términos/i })).toBeDefined()
      expect(screen.getByRole('link', { name: /privacidad/i })).toBeDefined()
    })
  })

  describe('successful registration', () => {
    it('calls registerWithEmailAndPassword with email and password', async () => {
      renderPage()
      fillForm()
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => {
        expect(mockAuthService.registerWithEmailAndPassword).toHaveBeenCalledWith(
          'new@example.com',
          'password123'
        )
      })
    })

    it('sends the email-verification action link after creating the account', async () => {
      renderPage()
      fillForm()
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => {
        expect(mockAuthService.sendEmailVerificationToCurrentUser).toHaveBeenCalled()
      })
    })

    it('navigates to /app/verify after success', async () => {
      renderPage()
      fillForm()
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/app/verify', { replace: true })
      })
    })

    it('still navigates to /app/verify when sendEmailVerification fails (resend lives in pipeline)', async () => {
      mockAuthService.sendEmailVerificationToCurrentUser.mockRejectedValueOnce(
        new Error('network')
      )
      renderPage()
      fillForm()
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/app/verify', { replace: true })
      })
      expect(mockToast.error).toHaveBeenCalled()
    })
  })

  describe('client-side validation', () => {
    it('blocks submit when passwords do not match', async () => {
      renderPage()
      fillForm({ confirmPassword: 'different' })
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => {
        expect(screen.getByText(/no coinciden/i)).toBeDefined()
      })
      expect(mockAuthService.registerWithEmailAndPassword).not.toHaveBeenCalled()
    })

    it('blocks submit when password is too short', async () => {
      renderPage()
      fillForm({ password: '12345', confirmPassword: '12345' })
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => {
        expect(screen.getByText(/al menos 6/i)).toBeDefined()
      })
      expect(mockAuthService.registerWithEmailAndPassword).not.toHaveBeenCalled()
    })

    it('blocks submit when email is invalid', async () => {
      renderPage()
      fillForm({ email: 'not-an-email' })
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => {
        expect(screen.getByText(/correo válido/i)).toBeDefined()
      })
      expect(mockAuthService.registerWithEmailAndPassword).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('shows mapped error for email-already-in-use', async () => {
      mockAuthService.registerWithEmailAndPassword.mockRejectedValueOnce({
        code: 'auth/email-already-in-use',
      })
      renderPage()
      fillForm()
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => {
        expect(screen.getByText(/ya existe una cuenta/i)).toBeDefined()
      })
      expect(mockNavigate).not.toHaveBeenCalled()
    })

    it('shows mapped error for weak-password from server', async () => {
      mockAuthService.registerWithEmailAndPassword.mockRejectedValueOnce({
        code: 'auth/weak-password',
      })
      renderPage()
      fillForm()
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => {
        expect(screen.getByText(/muy débil/i)).toBeDefined()
      })
    })

    it('does not navigate when registration fails', async () => {
      mockAuthService.registerWithEmailAndPassword.mockRejectedValueOnce({
        code: 'auth/network-request-failed',
      })
      renderPage()
      fillForm()
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => {
        expect(screen.getByText(/no pudimos crear/i)).toBeDefined()
      })
      expect(mockNavigate).not.toHaveBeenCalled()
      expect(mockAuthService.sendEmailVerificationToCurrentUser).not.toHaveBeenCalled()
    })
  })
})
