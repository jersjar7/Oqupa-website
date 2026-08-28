// @vitest-environment jsdom
// The pipeline after step 6 (docs/new-user-path-step6-plan.md): name only if
// unknown → phone → code → the email link LAST, detected by the page itself.
// The order is pinned by pipelineOrder.test.ts; these tests pin the screens.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const mockNavigate = vi.hoisted(() => vi.fn())
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>()
  return { ...mod, useNavigate: () => mockNavigate }
})
const mockAuthState = vi.hoisted(() => ({
  user: null as { name?: string; isPhoneVerified?: boolean } | null,
  firebaseUser: null as { uid: string; email?: string | null; emailVerified?: boolean } | null,
  refreshUser: vi.fn(),
  refreshFirebaseUser: vi.fn(),
}))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => mockAuthState }))
const mockAuthService = vi.hoisted(() => ({
  updateUserName: vi.fn(),
  sendPhoneVerificationCode: vi.fn(),
  verifyPhoneCode: vi.fn(),
  updateUserContactInfo: vi.fn(),
  initializeRecaptcha: vi.fn(),
  cleanupRecaptcha: vi.fn(),
  sendEmailVerificationToCurrentUser: vi.fn(),
  refreshSession: vi.fn(),
}))
vi.mock('@/services/authService', () => ({ authService: mockAuthService }))
const mockConsumeReturnUrl = vi.hoisted(() => vi.fn(() => null as string | null))
vi.mock('@/lib/utils', () => ({ consumeReturnUrl: mockConsumeReturnUrl }))
vi.mock('@/lib/authErrors', () => ({
  getPhoneAuthError: vi.fn(() => ({ message: 'Error de telefono', recoveryHint: null })),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('framer-motion', () => ({
  motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))
vi.mock('@/app/components/ui', () => ({
  Input: ({ label, error, ...props }: any) => (
    <>
      <input aria-label={label ?? props['aria-label']} {...props} />
      {error && <span role="alert">{error}</span>}
    </>
  ),
  Button: ({ children, isLoading, disabled, ...props }: any) => (
    <button disabled={disabled} {...props}>{children}</button>
  ),
}))

import AuthPipelinePage from '../AuthPipelinePage'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/verify']}>
      <Routes>
        <Route path="/app/verify" element={<AuthPipelinePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthPipelinePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthState.user = null
    mockAuthState.firebaseUser = { uid: 'uid-123', email: 'test@example.com', emailVerified: true }
    mockAuthState.refreshUser.mockResolvedValue(undefined)
    mockAuthState.refreshFirebaseUser.mockResolvedValue(mockAuthState.firebaseUser)
    mockConsumeReturnUrl.mockReturnValue(null)
  })
  afterEach(() => vi.useRealTimers())

  describe('redirects', () => {
    it('signed out → /app/login', async () => {
      mockAuthState.firebaseUser = null
      renderPage()
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app/login'))
    })
    it('nothing owed → the stored return address, or /app', async () => {
      mockAuthState.user = { name: 'Juan', isPhoneVerified: true }
      mockConsumeReturnUrl.mockReturnValue('/property/abc#contactar')
      renderPage()
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/property/abc#contactar', { replace: true }))
    })
  })

  describe('order', () => {
    it('a Google account (email verified, no name): name first, 3 steps in total', () => {
      renderPage()
      expect(screen.getByText(/cómo te llamas/i)).toBeDefined()
      expect(screen.getByText(/paso 1 de 3/i)).toBeDefined()
    })
    it('name known, phone not verified: the phone step, never the email step first', () => {
      mockAuthState.firebaseUser = { uid: 'u', email: 'e@x.com', emailVerified: false }
      mockAuthState.user = { name: 'Juan', isPhoneVerified: false }
      renderPage()
      expect(screen.getByText(/número de teléfono/i)).toBeDefined()
      expect(screen.queryByText(/revisa tu correo/i)).toBeNull()
      expect(screen.getByText(/paso 1 de 3/i)).toBeDefined()
    })
    it('phone verified, email link unclicked: the email step, last', () => {
      mockAuthState.firebaseUser = { uid: 'u', email: 'e@x.com', emailVerified: false }
      mockAuthState.user = { name: 'Juan', isPhoneVerified: true }
      renderPage()
      expect(screen.getByText(/revisa tu correo/i)).toBeDefined()
      expect(screen.getByText('e@x.com')).toBeDefined()
    })
  })

  describe('phone step', () => {
    beforeEach(() => { mockAuthState.user = { name: 'Juan', isPhoneVerified: false } })
    it('says why the number is asked for, and has no "verify later" escape', () => {
      renderPage()
      expect(screen.getByText(/persona real/i)).toBeDefined()
      expect(screen.queryByRole('button', { name: /verificar después/i })).toBeNull()
    })
    it('initialises reCAPTCHA on entry', () => {
      renderPage()
      expect(mockAuthService.initializeRecaptcha).toHaveBeenCalledWith('recaptcha-container')
    })
  })

  describe('code step', () => {
    beforeEach(() => {
      mockAuthState.user = { name: 'Juan', isPhoneVerified: false }
      mockAuthService.sendPhoneVerificationCode.mockResolvedValue('ver-1')
      mockAuthService.verifyPhoneCode.mockResolvedValue(undefined)
      mockAuthService.updateUserContactInfo.mockResolvedValue(undefined)
    })
    async function reachCodeStep() {
      renderPage()
      fireEvent.change(screen.getByPlaceholderText(/912 345 678/), { target: { value: '912345678' } })
      fireEvent.click(screen.getByRole('button', { name: /enviar código/i }))
      await waitFor(() => expect(screen.getByText(/ingresa el código/i)).toBeDefined())
    }
    it('submits itself on the sixth digit — there is no Verificar button', async () => {
      await reachCodeStep()
      expect(screen.queryByRole('button', { name: /^verificar$/i })).toBeNull()
      fireEvent.change(screen.getByLabelText(/código de 6 dígitos/i), { target: { value: '123456' } })
      await waitFor(() => expect(mockAuthService.verifyPhoneCode).toHaveBeenCalledWith('ver-1', '123456'))
    })
    it('resend waits 30 seconds, not 60, and says what to do if nothing arrives', async () => {
      await reachCodeStep()
      expect(screen.getByText(/reenviar en 30s/i)).toBeDefined()
      expect(screen.getByText(/¿no llega\?/i)).toBeDefined()
    })
  })

  describe('email step', () => {
    beforeEach(() => {
      mockAuthState.firebaseUser = { uid: 'u', email: 'e@x.com', emailVerified: false }
      mockAuthState.user = { name: 'Juan', isPhoneVerified: true }
    })
    it('has no "ya verifiqué" button — it checks by itself', () => {
      renderPage()
      expect(screen.queryByRole('button', { name: /ya verifiqu/i })).toBeNull()
      expect(screen.getByRole('button', { name: /reenviar correo/i })).toBeDefined()
    })
    it('polls, and when the link was clicked refreshes the session and finishes', async () => {
      vi.useFakeTimers()
      mockAuthState.refreshFirebaseUser.mockResolvedValue({ uid: 'u', email: 'e@x.com', emailVerified: true })
      mockAuthService.refreshSession.mockResolvedValue(undefined)
      renderPage()
      await act(async () => { await vi.advanceTimersByTimeAsync(4500) })
      expect(mockAuthState.refreshFirebaseUser).toHaveBeenCalled()
      expect(mockAuthService.refreshSession).toHaveBeenCalled()
    })
    it('checks again when the tab regains focus', async () => {
      renderPage()
      await act(async () => {
        window.dispatchEvent(new Event('focus'))
      })
      await waitFor(() => expect(mockAuthState.refreshFirebaseUser).toHaveBeenCalled())
    })
    it('"Reenviar correo" resends the link', async () => {
      mockAuthService.sendEmailVerificationToCurrentUser.mockResolvedValue(undefined)
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /reenviar correo/i }))
      await waitFor(() => expect(mockAuthService.sendEmailVerificationToCurrentUser).toHaveBeenCalled())
    })
  })

  it('cleans up reCAPTCHA on unmount', () => {
    const { unmount } = renderPage()
    unmount()
    expect(mockAuthService.cleanupRecaptcha).toHaveBeenCalled()
  })
})
