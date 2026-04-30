// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockAuthService = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
}))

vi.mock('@/services/authService', () => ({
  authService: mockAuthService,
}))

vi.mock('@/lib/authErrors', () => ({
  getForgotPasswordAuthError: vi.fn(() => ({ message: 'Error al enviar correo' })),
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
}))

// ── Import after mocks ──────────────────────────────────────────────────────

import ForgotPasswordPage from '../ForgotPasswordPage'

// ── Helpers ─────────────────────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>
  )
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthService.requestPasswordReset.mockResolvedValue(undefined)
  })

  describe('rendering', () => {
    it('renders email field', () => {
      renderPage()
      expect(screen.getByRole('textbox', { name: /correo/i })).toBeDefined()
    })

    it('renders submit button', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /enviar/i })).toBeDefined()
    })

    it('renders back to login link', () => {
      renderPage()
      expect(screen.getByRole('link', { name: /volver/i })).toBeDefined()
    })
  })

  describe('successful submission', () => {
    it('shows success confirmation after submitting valid email', async () => {
      renderPage()
      fireEvent.change(screen.getByRole('textbox', { name: /correo/i }), {
        target: { value: 'test@example.com' },
      })
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => {
        expect(screen.getByText(/correo enviado/i)).toBeDefined()
      })
    })

    it('calls requestPasswordReset with the entered email', async () => {
      renderPage()
      fireEvent.change(screen.getByRole('textbox', { name: /correo/i }), {
        target: { value: 'test@example.com' },
      })
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => {
        expect(mockAuthService.requestPasswordReset).toHaveBeenCalledWith(
          'test@example.com'
        )
      })
    })
  })

  describe('error handling', () => {
    it('shows error message on failed request', async () => {
      mockAuthService.requestPasswordReset.mockRejectedValue(new Error('not-found'))
      renderPage()
      fireEvent.change(screen.getByRole('textbox', { name: /correo/i }), {
        target: { value: 'test@example.com' },
      })
      fireEvent.submit(document.querySelector('form')!)
      await waitFor(() => {
        expect(screen.getByText('Error al enviar correo')).toBeDefined()
      })
    })
  })
})
