// @vitest-environment jsdom
/**
 * Additional tests for SetPasswordPage covering the success redirect,
 * the generic error case, and the emailVerified rendering path.
 *
 * Complements SetPasswordPage.test.tsx (verifying/invalid/ready/errors).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAuthService = vi.hoisted(() => ({
  verifySetPasswordCode: vi.fn(),
  confirmSetPassword: vi.fn(),
  checkEmailVerificationCode: vi.fn(),
  applyEmailVerificationCode: vi.fn(),
}))

vi.mock('@/services/authService', () => ({
  authService: mockAuthService,
}))

vi.mock('@/app/components/ui', () => ({
  Input: ({ label, error, revealToggle: _rt, ...props }: { label: string; error?: string; revealToggle?: boolean; [key: string]: unknown }) => (
    <>
      <input aria-label={label as string} {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />
      {error && <span role="alert">{error}</span>}
    </>
  ),
  Button: ({ children, isLoading, ...props }: { children: React.ReactNode; isLoading?: boolean; [key: string]: unknown }) => (
    <button {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>
  ),
}))

// PasswordRequirements imports nothing external — let it render naturally
// by NOT mocking it, to exercise its rendering during form display.

// ── Import after mocks ───────────────────────────────────────────────────────

import SetPasswordPage from '../SetPasswordPage'

// ── Helpers ─────────────────────────────────────────────────────────────────

function renderPage(search = '?oobCode=valid-code&mode=resetPassword') {
  return render(
    <MemoryRouter initialEntries={[`/app/set-password${search}`]}>
      <Routes>
        <Route path="/app/set-password" element={<SetPasswordPage />} />
        <Route path="/app" element={<div data-testid="dashboard">Dashboard</div>} />
        <Route path="/app/verify" element={<div data-testid="verify-page">Verify</div>} />
        <Route path="/app/forgot-password" element={<div data-testid="forgot">Forgot</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ── Success path: navigate to /app after setting password ────────────────────

describe('successful password submission (line 99)', () => {
  beforeEach(() => {
    mockAuthService.verifySetPasswordCode.mockResolvedValue('user@example.com')
    mockAuthService.confirmSetPassword.mockResolvedValue(undefined)
  })

  it('navigates to /app after successfully setting the password', async () => {
    renderPage()

    // Wait for ready state
    await waitFor(() => {
      expect(screen.getByLabelText(/nueva contrase/i)).toBeDefined()
    })

    fireEvent.change(screen.getByLabelText(/nueva contrase/i), {
      target: { value: 'Password1!' },
    })
    fireEvent.change(screen.getByLabelText(/confirma/i), {
      target: { value: 'Password1!' },
    })
    fireEvent.submit(document.querySelector('form')!)

    await waitFor(() => {
      expect(screen.getByTestId('dashboard')).toBeDefined()
    })
  })

  it('calls confirmSetPassword with the oobCode, password, and email', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/nueva contrase/i)).toBeDefined()
    })

    fireEvent.change(screen.getByLabelText(/nueva contrase/i), {
      target: { value: 'SecurePass1!' },
    })
    fireEvent.change(screen.getByLabelText(/confirma/i), {
      target: { value: 'SecurePass1!' },
    })
    fireEvent.submit(document.querySelector('form')!)

    await waitFor(() => {
      expect(mockAuthService.confirmSetPassword).toHaveBeenCalledWith(
        'valid-code',
        'SecurePass1!',
        'user@example.com',
      )
    })
  })
})

// ── Generic error path (line 109) ───────────────────────────────────────────

describe('generic submit error (line 109)', () => {
  beforeEach(() => {
    mockAuthService.verifySetPasswordCode.mockResolvedValue('user@example.com')
  })

  it('shows generic error message for unknown errors', async () => {
    mockAuthService.confirmSetPassword.mockRejectedValue(new Error('some-unknown-error'))

    renderPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/nueva contrase/i)).toBeDefined()
    })

    fireEvent.change(screen.getByLabelText(/nueva contrase/i), {
      target: { value: 'Password1!' },
    })
    fireEvent.change(screen.getByLabelText(/confirma/i), {
      target: { value: 'Password1!' },
    })
    fireEvent.submit(document.querySelector('form')!)

    await waitFor(() => {
      expect(screen.getByText(/no pudimos configurar/i)).toBeDefined()
    })
  })
})

// ── emailVerified path (lines 146-159) ──────────────────────────────────────

describe('emailVerified state (mode=verifyEmail)', () => {
  beforeEach(() => {
    mockAuthService.checkEmailVerificationCode.mockResolvedValue('verified@example.com')
    mockAuthService.applyEmailVerificationCode.mockResolvedValue(undefined)
  })

  it('renders the "Correo verificado" heading after email verification', async () => {
    renderPage('?oobCode=verify-code&mode=verifyEmail')

    await waitFor(() => {
      expect(screen.getByText(/correo verificado/i)).toBeDefined()
    })
  })

  it('shows the verified email address in the UI', async () => {
    renderPage('?oobCode=verify-code&mode=verifyEmail')

    await waitFor(() => {
      expect(screen.getByText('verified@example.com')).toBeDefined()
    })
  })

  it('navigates to /app/verify when "Continuar" is clicked after email verification', async () => {
    renderPage('?oobCode=verify-code&mode=verifyEmail')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /continuar/i })).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))

    await waitFor(() => {
      expect(screen.getByTestId('verify-page')).toBeDefined()
    })
  })

  it('shows an invalid state when checkEmailVerificationCode throws', async () => {
    mockAuthService.checkEmailVerificationCode.mockRejectedValue(new Error('expired'))

    renderPage('?oobCode=verify-code&mode=verifyEmail')

    await waitFor(() => {
      expect(screen.getByText(/enlace de verificación expiró/i)).toBeDefined()
    })
  })

  it('does not show "Solicitar nuevo enlace" for verifyEmail invalid state (no link)', async () => {
    mockAuthService.checkEmailVerificationCode.mockRejectedValue(new Error('expired'))

    renderPage('?oobCode=verify-code&mode=verifyEmail')

    await waitFor(() => {
      expect(screen.getByText(/enlace inv/i)).toBeDefined()
    })

    // For mode=verifyEmail, the "Solicitar un nuevo enlace" Link is NOT shown
    // (only shown when mode !== 'verifyEmail')
    expect(screen.queryByRole('link', { name: /nuevo enlace/i })).toBeNull()
  })
})
