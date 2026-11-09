// @vitest-environment jsdom
// Jerson 2026-11-09, after Javier waited since May for an SMS code that Google
// kept refusing from his office network: every failure at the phone step is
// reported to the team, and the person is told what actually works, in his
// words: "Google está bloqueando los códigos desde tu conexión de internet.
// Prueba con los datos móviles de tu celular o desde la app de Oqupa."
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
  requestEmailChange: vi.fn(),
}))
vi.mock('@/services/authService', () => ({ authService: mockAuthService }))
const mockConsumeReturnUrl = vi.hoisted(() => vi.fn(() => null as string | null))
vi.mock('@/lib/utils', () => ({ consumeReturnUrl: mockConsumeReturnUrl, peekReturnUrl: vi.fn(() => null), setReturnUrl: vi.fn() }))
// The real module first, so messages added later need no stand-in here.
const mockReport = vi.hoisted(() => vi.fn())
vi.mock('@/services/phoneStepFailures', () => ({ reportPhoneStepFailure: mockReport }))
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

const BLOCKED = 'Google está bloqueando los códigos desde tu conexión de internet. Prueba con los datos móviles de tu celular o desde la app de Oqupa.'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/app/verify']}>
      <Routes>
        <Route path="/app/verify" element={<AuthPipelinePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AuthPipelinePage — when the SMS code does not come', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFunnel.pendingContactErrand.mockReturnValue(null)
    mockAuthState.firebaseUser = { uid: 'uid-123', email: 'test@example.com', emailVerified: true }
    mockAuthState.user = { name: 'Juan', isPhoneVerified: false }
    mockAuthState.refreshUser.mockResolvedValue(undefined)
    mockAuthState.refreshFirebaseUser.mockResolvedValue(mockAuthState.firebaseUser)
    mockConsumeReturnUrl.mockReturnValue(null)
    mockAuthService.sendPhoneVerificationCode.mockResolvedValue('ver-1')
    mockAuthService.verifyPhoneCode.mockResolvedValue(undefined)
  })
  afterEach(() => vi.useRealTimers())

  function typeNumberAndSend() {
    renderPage()
    fireEvent.change(screen.getByPlaceholderText(/912 345 678/), { target: { value: '912345678' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar código/i }))
  }

  it('Google refusing to send says so, in Jerson\'s words, and tells the team', async () => {
    mockAuthService.sendPhoneVerificationCode.mockRejectedValue({ code: 'auth/too-many-requests' })
    typeNumberAndSend()
    await waitFor(() => expect(screen.getAllByText(BLOCKED).length).toBeGreaterThan(0))
    expect(mockReport).toHaveBeenCalledWith({ code: 'auth/too-many-requests', step: 'send' })
  })

  it('a wrong code is reported too', async () => {
    mockAuthService.verifyPhoneCode.mockRejectedValue({ code: 'auth/invalid-verification-code' })
    typeNumberAndSend()
    await waitFor(() => expect(screen.getByText(/ingresa el código/i)).toBeDefined())
    fireEvent.change(screen.getByLabelText(/código de 6 dígitos/i), { target: { value: '123456' } })
    await waitFor(() => expect(mockReport).toHaveBeenCalledWith({ code: 'auth/invalid-verification-code', step: 'verify' }))
  })

  it('after a minute without a code, "¿No te llegó el código?" explains what works and tells the team', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    typeNumberAndSend()
    await waitFor(() => expect(screen.getByText(/ingresa el código/i)).toBeDefined())
    expect(screen.queryByRole('button', { name: /no te llegó el código/i })).toBeNull()
    act(() => { vi.advanceTimersByTime(60_000) })
    const ask = await screen.findByRole('button', { name: /no te llegó el código/i })
    fireEvent.click(ask)
    // Not "Google está bloqueando": a code sent but never delivered is often the carrier.
    expect(screen.getByText(/Prueba con los datos móviles de tu celular o desde la app de Oqupa\./)).toBeDefined()
    expect(screen.queryByText(/Google está bloqueando/)).toBeNull()
    expect(screen.getByText(/admin@oqupa\.com/)).toBeDefined()
    expect(mockReport).toHaveBeenCalledWith({ code: 'no-code', step: 'no-code' })
  })
})
