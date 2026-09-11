// @vitest-environment jsdom
/**
 * Tests for AuthPipelinePage form submission handlers — the async logic that
 * calls authService, shows toasts, and advances the pipeline step.
 *
 * These complement AuthPipelinePage.test.tsx which covers rendering/redirects.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ── Mocks ────────────────────────────────────────────────────────────────────

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

const mockConsumeReturnUrl = vi.hoisted(() => vi.fn(() => null as string | null))

vi.mock('@/lib/utils', () => ({
  consumeReturnUrl: mockConsumeReturnUrl,
}))

vi.mock('@/lib/authErrors', () => ({
  getPhoneAuthError: vi.fn((err: unknown) => ({
    message: `Error: ${err instanceof Error ? err.message : String(err)}`,
    recoveryHint: null,
  })),
}))

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))
vi.mock('sonner', () => ({ toast: mockToast }))

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) =>
      <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@/app/components/ui', () => ({
  Input: ({ label, error, ...props }: { label: string; error?: string; [key: string]: unknown }) => (
    <>
      <input aria-label={label as string} {...(props as React.InputHTMLAttributes<HTMLInputElement>)} />
      {error && <span role="alert">{error}</span>}
    </>
  ),
  Button: ({ children, isLoading, disabled, ...props }: { children: React.ReactNode; isLoading?: boolean; disabled?: boolean; [key: string]: unknown }) => (
    <button disabled={disabled} {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}>{children}</button>
  ),
}))

// ── Import after mocks ───────────────────────────────────────────────────────

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

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockAuthState.user = null
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

// ── Name step submissions ────────────────────────────────────────────────────

describe('name step — onSubmit', () => {
  it('calls updateUserName with the entered name on successful submission', async () => {
    mockAuthService.updateUserName.mockResolvedValue(undefined)
    mockAuthState.user = null

    renderPage()

    const nameInput = screen.getByLabelText(/nombre/i)
    fireEvent.change(nameInput, { target: { value: 'Juan Pérez' } })
    fireEvent.submit(nameInput.closest('form')!)

    await waitFor(() => {
      expect(mockAuthService.updateUserName).toHaveBeenCalledWith('uid-123', 'Juan Pérez')
    })
  })

  it('calls refreshUser after a successful name update', async () => {
    mockAuthService.updateUserName.mockResolvedValue(undefined)
    mockAuthState.user = null

    renderPage()

    const nameInput = screen.getByLabelText(/nombre/i)
    fireEvent.change(nameInput, { target: { value: 'María García' } })
    fireEvent.submit(nameInput.closest('form')!)

    await waitFor(() => {
      expect(mockAuthState.refreshUser).toHaveBeenCalled()
    })
  })

  it('shows a success toast and advances to phone step on success', async () => {
    mockAuthService.updateUserName.mockResolvedValue(undefined)
    mockAuthState.user = null

    renderPage()

    const nameInput = screen.getByLabelText(/nombre/i)
    fireEvent.change(nameInput, { target: { value: 'Ana López' } })
    fireEvent.submit(nameInput.closest('form')!)

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Nombre guardado')
    })

    await waitFor(() => {
      expect(screen.getByText(/número de tel/i)).toBeDefined()
    })
  })

  it('shows error message and error toast when updateUserName fails', async () => {
    mockAuthService.updateUserName.mockRejectedValue(new Error('network error'))
    mockAuthState.user = null

    renderPage()

    const nameInput = screen.getByLabelText(/nombre/i)
    fireEvent.change(nameInput, { target: { value: 'Pedro Ramírez' } })
    fireEvent.submit(nameInput.closest('form')!)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Error al guardar el nombre')
    })
    expect(screen.getByText('Error al guardar el nombre')).toBeDefined()
  })

  it('stays on name step when submission fails', async () => {
    mockAuthService.updateUserName.mockRejectedValue(new Error('fail'))
    mockAuthState.user = null

    renderPage()

    const nameInput = screen.getByLabelText(/nombre/i)
    fireEvent.change(nameInput, { target: { value: 'Pedro Ramírez' } })
    fireEvent.submit(nameInput.closest('form')!)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled()
    })

    // Should still be on the name step
    expect(screen.getByText(/cómo te llamas/i)).toBeDefined()
  })
})

// ── Phone step submissions ────────────────────────────────────────────────────

describe('phone step — onSubmit', () => {
  beforeEach(() => {
    mockAuthState.user = { name: 'Juan', isPhoneVerified: false }
  })

  // The phone Input component does not receive a `label` prop, so we select
  // it by its default placeholder which is '912 345 678' (the +51 Peru default).
  it('calls sendPhoneVerificationCode with the full phone number', async () => {
    mockAuthService.sendPhoneVerificationCode.mockResolvedValue('verification-id-123')

    renderPage()

    const phoneInput = screen.getByPlaceholderText('912 345 678')
    fireEvent.change(phoneInput, { target: { value: '987654321' } })
    fireEvent.submit(phoneInput.closest('form')!)

    await waitFor(() => {
      expect(mockAuthService.sendPhoneVerificationCode).toHaveBeenCalledWith('+51987654321')
    })
  })

  it('advances to verify-code step after sending the SMS', async () => {
    mockAuthService.sendPhoneVerificationCode.mockResolvedValue('verification-id-123')

    renderPage()

    const phoneInput = screen.getByPlaceholderText('912 345 678')
    fireEvent.change(phoneInput, { target: { value: '987654321' } })
    fireEvent.submit(phoneInput.closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/ingresa el código/i)).toBeDefined()
    })
  })

  it('shows success toast when code is sent', async () => {
    mockAuthService.sendPhoneVerificationCode.mockResolvedValue('verification-id-123')

    renderPage()

    const phoneInput = screen.getByPlaceholderText('912 345 678')
    fireEvent.change(phoneInput, { target: { value: '987654321' } })
    fireEvent.submit(phoneInput.closest('form')!)

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Código enviado')
    })
  })

  it('shows error when sendPhoneVerificationCode fails', async () => {
    mockAuthService.sendPhoneVerificationCode.mockRejectedValue(
      Object.assign(new Error('bad captcha'), { code: 'auth/captcha-check-failed' })
    )

    renderPage()

    const phoneInput = screen.getByPlaceholderText('912 345 678')
    fireEvent.change(phoneInput, { target: { value: '987654321' } })
    fireEvent.submit(phoneInput.closest('form')!)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled()
    })
  })

  it('reinitializes reCAPTCHA on captcha-check-failed error', async () => {
    mockAuthService.sendPhoneVerificationCode.mockRejectedValue(
      Object.assign(new Error('bad captcha'), { code: 'auth/captcha-check-failed' })
    )

    renderPage()

    const phoneInput = screen.getByPlaceholderText('912 345 678')
    fireEvent.change(phoneInput, { target: { value: '987654321' } })
    fireEvent.submit(phoneInput.closest('form')!)

    await waitFor(() => {
      expect(mockAuthService.cleanupRecaptcha).toHaveBeenCalled()
      expect(mockAuthService.initializeRecaptcha).toHaveBeenCalledWith('recaptcha-container')
    })
  })

  it('navigates to /app/profile when skip button is clicked', async () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /verificar después/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app/profile')
    })
  })
})

// ── Verify-code step submissions ──────────────────────────────────────────────

describe('verify-code step — onSubmit', () => {
  async function advanceToCodeStep() {
    mockAuthState.user = { name: 'Juan', isPhoneVerified: false }
    mockAuthService.sendPhoneVerificationCode.mockResolvedValue('ver-id-xyz')

    renderPage()

    const phoneInput = screen.getByPlaceholderText('912 345 678')
    fireEvent.change(phoneInput, { target: { value: '987654321' } })
    fireEvent.submit(phoneInput.closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/ingresa el código/i)).toBeDefined()
    })
  }

  it('calls verifyPhoneCode with the verification ID and entered code', async () => {
    mockAuthService.verifyPhoneCode.mockResolvedValue(undefined)
    mockAuthService.updateUserContactInfo.mockResolvedValue(undefined)
    await advanceToCodeStep()

    const codeInput = screen.getByPlaceholderText('000000')
    fireEvent.change(codeInput, { target: { value: '123456' } })
    fireEvent.submit(codeInput.closest('form')!)

    await waitFor(() => {
      expect(mockAuthService.verifyPhoneCode).toHaveBeenCalledWith('ver-id-xyz', '123456')
    })
  })

  it('calls updateUserContactInfo with the phone number after successful verification', async () => {
    mockAuthService.verifyPhoneCode.mockResolvedValue(undefined)
    mockAuthService.updateUserContactInfo.mockResolvedValue(undefined)
    await advanceToCodeStep()

    const codeInput = screen.getByPlaceholderText('000000')
    fireEvent.change(codeInput, { target: { value: '123456' } })
    fireEvent.submit(codeInput.closest('form')!)

    await waitFor(() => {
      expect(mockAuthService.updateUserContactInfo).toHaveBeenCalledWith(
        'uid-123',
        expect.objectContaining({ whatsappPhoneNumber: '+51987654321' })
      )
    })
  })

  it('navigates to /app after successful verification when no return URL', async () => {
    mockAuthService.verifyPhoneCode.mockResolvedValue(undefined)
    mockAuthService.updateUserContactInfo.mockResolvedValue(undefined)
    mockConsumeReturnUrl.mockReturnValue(null)
    await advanceToCodeStep()

    const codeInput = screen.getByPlaceholderText('000000')
    fireEvent.change(codeInput, { target: { value: '123456' } })
    fireEvent.submit(codeInput.closest('form')!)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app')
    })
  })

  it('navigates to the return URL when one exists', async () => {
    mockAuthService.verifyPhoneCode.mockResolvedValue(undefined)
    mockAuthService.updateUserContactInfo.mockResolvedValue(undefined)
    mockConsumeReturnUrl.mockReturnValue('/app/listings/new')
    await advanceToCodeStep()

    const codeInput = screen.getByPlaceholderText('000000')
    fireEvent.change(codeInput, { target: { value: '123456' } })
    fireEvent.submit(codeInput.closest('form')!)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app/listings/new')
    })
  })

  it('shows error toast when verifyPhoneCode fails', async () => {
    mockAuthService.verifyPhoneCode.mockRejectedValue(new Error('invalid code'))
    await advanceToCodeStep()

    const codeInput = screen.getByPlaceholderText('000000')
    fireEvent.change(codeInput, { target: { value: '999999' } })
    fireEvent.submit(codeInput.closest('form')!)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled()
    })
  })

  it('stays on verify-code step when verification fails', async () => {
    mockAuthService.verifyPhoneCode.mockRejectedValue(new Error('invalid code'))
    await advanceToCodeStep()

    const codeInput = screen.getByPlaceholderText('000000')
    fireEvent.change(codeInput, { target: { value: '999999' } })
    fireEvent.submit(codeInput.closest('form')!)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled()
    })

    expect(screen.getByText(/ingresa el código/i)).toBeDefined()
  })

  it('goes back to phone step when "Cambiar número" is clicked', async () => {
    await advanceToCodeStep()

    // "Cambiar número" always works regardless of cooldown — it calls onChangeNumber
    const changeButton = screen.getByRole('button', { name: /cambiar número/i })
    fireEvent.click(changeButton)

    await waitFor(() => {
      expect(screen.getByText(/número de tel/i)).toBeDefined()
    })
  })
})

// ── Email-verify step edge cases ──────────────────────────────────────────────

describe('email-verify step — onResend error path', () => {
  beforeEach(() => {
    mockAuthState.firebaseUser = {
      uid: 'uid-123',
      email: 'fail@example.com',
      emailVerified: false,
    }
  })

  it('shows error toast when sendEmailVerificationToCurrentUser throws', async () => {
    mockAuthService.sendEmailVerificationToCurrentUser.mockRejectedValue(new Error('smtp error'))

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /reenviar correo/i }))

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('No pudimos reenviar el correo. Intenta de nuevo.')
    })
  })

  it('shows error when refreshFirebaseUser throws during "Ya verifiqué"', async () => {
    mockAuthState.refreshFirebaseUser.mockRejectedValue(new Error('network failure'))

    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /ya verifiqué/i }))

    await waitFor(() => {
      expect(screen.getByText(/no pudimos verificar/i)).toBeDefined()
    })
  })
})

// ── Verify-code step — onResend cooldown guard ───────────────────────────────
//
// When smsCooldown > 0 the "Reenviar" button is disabled and the handler
// returns early (line 296 branch). We verify the button is disabled rather
// than trying to advance fake timers across waitFor boundaries.

describe('verify-code step — resend button state', () => {
  it('disables the resend button immediately after sending the code (cooldown > 0)', async () => {
    mockAuthState.user = { name: 'Juan', isPhoneVerified: false }
    mockAuthService.sendPhoneVerificationCode.mockResolvedValue('ver-id-abc')

    renderPage()

    const phoneInput = screen.getByPlaceholderText('912 345 678')
    fireEvent.change(phoneInput, { target: { value: '987654321' } })
    fireEvent.submit(phoneInput.closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/ingresa el código/i)).toBeDefined()
    })

    // The resend button should be disabled while cooldown > 0
    const resendButton = screen.getByRole('button', { name: /reenviar en/i })
    expect(resendButton).toHaveProperty('disabled', true)
  })
})
