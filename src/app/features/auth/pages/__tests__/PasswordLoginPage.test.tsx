// @vitest-environment jsdom
// The entry screen after step 6: one door — Google is the obvious action,
// "Continuar con correo" reveals the form. A mismatch offers both ways forward,
// because production hides whether an email has an account.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const mockAuthService = vi.hoisted(() => ({
  loginWithEmailAndPassword: vi.fn(),
  signInWithGoogle: vi.fn(),
}))
vi.mock('@/services/authService', () => ({ authService: mockAuthService }))
vi.mock('@/lib/authErrors', () => ({
  getLoginAuthError: vi.fn(() => ({ message: 'Credenciales incorrectas' })),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/app/components/ui', () => ({
  Input: ({ label, error, revealToggle: _rt, ...props }: any) => (
    <>
      <input aria-label={label} {...props} />
      {error && <span role="alert">{error}</span>}
    </>
  ),
  Button: ({ children, isLoading, ...props }: any) => <button {...props}>{children}</button>,
}))

import PasswordLoginPage from '../PasswordLoginPage'

function renderPage(entry = '/app/login') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <PasswordLoginPage />
    </MemoryRouter>,
  )
}
function openEmail() {
  fireEvent.click(screen.getByRole('button', { name: /continuar con correo/i }))
}
function fillForm(email = 'test@example.com', password = 'password123') {
  fireEvent.change(screen.getByRole('textbox', { name: /correo/i }), { target: { value: email } })
  fireEvent.change(screen.getByLabelText(/contrase/i), { target: { value: password } })
}

describe('PasswordLoginPage — the entry screen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('offers Google first and the email form only on request', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /continuar con google/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /continuar con correo/i })).toBeDefined()
    expect(screen.queryByRole('textbox', { name: /correo/i })).toBeNull()
    expect(screen.queryByText(/enlace mágico/i)).toBeNull()
  })

  it('Google signs in with one click', async () => {
    mockAuthService.signInWithGoogle.mockResolvedValue({ uid: 'g' })
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /continuar con google/i }))
    await waitFor(() => expect(mockAuthService.signInWithGoogle).toHaveBeenCalled())
  })

  it('email + password sign in', async () => {
    mockAuthService.loginWithEmailAndPassword.mockResolvedValue({ uid: 'u' })
    renderPage()
    openEmail()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }))
    await waitFor(() =>
      expect(mockAuthService.loginWithEmailAndPassword).toHaveBeenCalledWith('test@example.com', 'password123'),
    )
  })

  it('a mismatch offers to create the account with that email, or recover the password', async () => {
    mockAuthService.loginWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-credential' })
    renderPage()
    openEmail()
    fillForm('ana@example.com')
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }))
    await waitFor(() => expect(screen.getByText(/no coinciden/i)).toBeDefined())
    const create = screen.getByRole('link', { name: /crea tu cuenta con este correo/i })
    expect(create.getAttribute('href')).toBe('/app/register?email=ana%40example.com')
    expect(screen.getAllByRole('link', { name: /olvidaste tu contraseña/i }).length).toBeGreaterThan(0)
  })

  it('other errors show the mapped message', async () => {
    mockAuthService.loginWithEmailAndPassword.mockRejectedValue({ code: 'auth/network-request-failed' })
    renderPage()
    openEmail()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: /^continuar$/i }))
    await waitFor(() => expect(screen.getByText(/credenciales incorrectas/i)).toBeDefined())
  })

  it('?correo=1 opens the email form directly', () => {
    renderPage('/app/login?correo=1')
    expect(screen.getByRole('textbox', { name: /correo/i })).toBeDefined()
  })
})
