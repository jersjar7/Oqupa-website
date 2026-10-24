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
  logout: vi.fn(),
}))
vi.mock('@/services/authService', () => ({ authService: mockAuthService }))
const mockConsumeReturnUrl = vi.hoisted(() => vi.fn(() => null as string | null))
vi.mock('@/lib/utils', () => ({ consumeReturnUrl: mockConsumeReturnUrl, peekReturnUrl: vi.fn(() => null), setReturnUrl: vi.fn() }))
// The real module first, so messages added later need no stand-in here.
vi.mock('@/lib/authErrors', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/authErrors')>()),
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


// Metrics plan A10: the contact-funnel helpers, so these tests see which
// milestones the page reports (the helpers themselves are tested on their own).
const mockFunnel = vi.hoisted(() => ({
  errand: { at: 123 },
  pendingContactErrand: vi.fn(),
  logContactMilestone: vi.fn(),
}))
vi.mock('@/app/features/listings/contactFunnel', () => ({
  CONTACT_GATE_STEPS: {
    signedIn: 'signed_in',
    phoneCodeSent: 'phone_code_sent',
    phoneVerified: 'phone_verified',
    emailVerified: 'email_verified',
  },
  pendingContactErrand: mockFunnel.pendingContactErrand,
  logContactMilestone: mockFunnel.logContactMilestone,
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

  // "Usar otra cuenta" (approved 2026-10-24): the only way out of a
  // half-finished account on a phone, where the header hides "Salir".
  describe('a way out to another account', () => {
    it('is offered on every step', () => {
      renderPage()
      expect(screen.getByRole('button', { name: /usar otra cuenta/i })).toBeDefined()
    })
    it('signs out, then opens the sign-in door', async () => {
      mockAuthService.logout.mockResolvedValue(undefined)
      renderPage()
      fireEvent.click(screen.getByRole('button', { name: /usar otra cuenta/i }))
      await waitFor(() => expect(mockAuthService.logout).toHaveBeenCalledOnce())
      await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/app/login', { replace: true }))
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

describe('AuthPipelinePage — contact funnel (A10)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFunnel.pendingContactErrand.mockReturnValue(mockFunnel.errand)
    mockAuthState.firebaseUser = { uid: 'uid-123', email: 'test@example.com', emailVerified: true }
    mockAuthState.user = { name: 'Juan', isPhoneVerified: false }
    mockAuthState.refreshUser.mockResolvedValue(undefined)
    mockAuthState.refreshFirebaseUser.mockResolvedValue(mockAuthState.firebaseUser)
    mockConsumeReturnUrl.mockReturnValue(null)
    mockAuthService.sendPhoneVerificationCode.mockResolvedValue('ver-1')
    mockAuthService.verifyPhoneCode.mockResolvedValue(undefined)
    mockAuthService.updateUserContactInfo.mockResolvedValue(undefined)
  })
  afterEach(() => vi.useRealTimers())

  function steps() {
    return mockFunnel.logContactMilestone.mock.calls.map((c) => c[0])
  }

  async function sendCode() {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText(/912 345 678/), { target: { value: '912345678' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar código/i }))
    await waitFor(() => expect(screen.getByText(/ingresa el código/i)).toBeDefined())
  }

  it('reports phone_code_sent once the first code is sent', async () => {
    await sendCode()
    expect(steps()).toEqual(['phone_code_sent'])
  })

  it('reports nothing when sending the code fails', async () => {
    mockAuthService.sendPhoneVerificationCode.mockRejectedValue({ code: 'auth/too-many-requests' })
    renderPage()
    fireEvent.change(screen.getByPlaceholderText(/912 345 678/), { target: { value: '912345678' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar código/i }))
    await waitFor(() => expect(mockAuthService.sendPhoneVerificationCode).toHaveBeenCalled())
    expect(steps()).toEqual([])
  })

  it('reports phone_verified once the code is accepted', async () => {
    await sendCode()
    fireEvent.change(screen.getByLabelText(/código de 6 dígitos/i), { target: { value: '123456' } })
    await waitFor(() => expect(steps()).toEqual(['phone_code_sent', 'phone_verified']))
  })

  it('reports nothing for a wrong code', async () => {
    mockAuthService.verifyPhoneCode.mockRejectedValue({ code: 'auth/invalid-verification-code' })
    await sendCode()
    fireEvent.change(screen.getByLabelText(/código de 6 dígitos/i), { target: { value: '123456' } })
    await waitFor(() => expect(mockAuthService.verifyPhoneCode).toHaveBeenCalled())
    expect(steps()).toEqual(['phone_code_sent'])
  })

  it('uses the errand captured when the page opened, even if another tab consumed it since', async () => {
    vi.useFakeTimers()
    // Pending when the page opens; gone by the time the email is confirmed,
    // because the email-link tab finished first and consumed the return URL.
    mockFunnel.pendingContactErrand.mockReturnValueOnce(mockFunnel.errand).mockReturnValue(null)
    mockAuthState.firebaseUser = { uid: 'u', email: 'e@x.com', emailVerified: false }
    mockAuthState.user = { name: 'Juan', isPhoneVerified: true }
    mockAuthState.refreshFirebaseUser.mockResolvedValue({ uid: 'u', email: 'e@x.com', emailVerified: true })
    mockAuthService.refreshSession.mockResolvedValue(undefined)
    renderPage()
    await act(async () => { await vi.advanceTimersByTimeAsync(4500) })
    expect(mockFunnel.logContactMilestone).toHaveBeenCalledWith('email_verified', mockFunnel.errand)
  })

  it('passes the captured errand for the phone steps too', async () => {
    mockFunnel.pendingContactErrand.mockReturnValueOnce(mockFunnel.errand).mockReturnValue(null)
    await sendCode()
    expect(mockFunnel.logContactMilestone).toHaveBeenCalledWith('phone_code_sent', mockFunnel.errand)
  })

  it('reports email_verified when the poll sees the link was clicked', async () => {
    vi.useFakeTimers()
    mockAuthState.firebaseUser = { uid: 'u', email: 'e@x.com', emailVerified: false }
    mockAuthState.user = { name: 'Juan', isPhoneVerified: true }
    mockAuthState.refreshFirebaseUser.mockResolvedValue({ uid: 'u', email: 'e@x.com', emailVerified: true })
    mockAuthService.refreshSession.mockResolvedValue(undefined)
    renderPage()
    await act(async () => { await vi.advanceTimersByTimeAsync(4500) })
    expect(steps()).toEqual(['email_verified'])
  })
})
