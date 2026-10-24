// @vitest-environment jsdom
// The link sent by "Cámbialo" (email sign-up fix, step 2) opens this page with
// mode=verifyAndChangeEmail — measured on staging 2026-10-24, for links the
// website and the app send alike. Opening it switches the account's email,
// confirms it, and ends the old session.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'

const mockAuthService = vi.hoisted(() => ({
  verifySetPasswordCode: vi.fn(),
  confirmSetPassword: vi.fn(),
  applyEmailChangeCode: vi.fn(),
  applyRecoverEmailCode: vi.fn(),
}))
vi.mock('@/services/authService', () => ({ authService: mockAuthService }))
vi.mock('@/app/components/ui', () => ({
  Input: ({ label, ...props }: any) => <input aria-label={label} {...props} />,
  Button: ({ children, isLoading, ...props }: any) => <button {...props}>{children}</button>,
}))

import SetPasswordPage from '../SetPasswordPage'

function Where() {
  const l = useLocation()
  return <div data-testid="where">{l.pathname + l.search}</div>
}

function renderPage(search: string) {
  return render(
    <MemoryRouter initialEntries={[`/app/auth/set-password${search}`]}>
      <Routes>
        <Route path="/app/auth/set-password" element={<SetPasswordPage />} />
        <Route path="/app/login" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('SetPasswordPage — a changed email', () => {
  beforeEach(() => vi.clearAllMocks())

  it('applies the change and tells the person how to sign in now', async () => {
    mockAuthService.applyEmailChangeCode.mockResolvedValue({ newEmail: 'bien@x.com', previousEmail: 'tipo@x.com' })
    renderPage('?mode=verifyAndChangeEmail&oobCode=c1')
    await waitFor(() => expect(screen.getByText('Correo actualizado')).toBeDefined())
    expect(mockAuthService.applyEmailChangeCode).toHaveBeenCalledWith('c1')
    expect(screen.getByText('Tu correo ahora es bien@x.com. Entra a Oqupa con él y tu misma contraseña.')).toBeDefined()
    expect(mockAuthService.verifySetPasswordCode).not.toHaveBeenCalled()
  })

  it('"Entrar" opens sign-in with the new email filled in', async () => {
    mockAuthService.applyEmailChangeCode.mockResolvedValue({ newEmail: 'bien@x.com', previousEmail: 'tipo@x.com' })
    renderPage('?mode=verifyAndChangeEmail&oobCode=c1')
    fireEvent.click(await screen.findByRole('button', { name: /entrar/i }))
    expect(screen.getByTestId('where').textContent).toBe('/app/login?correo=1&cambio=1&email=bien%40x.com')
  })

  it('an address that already has an account is explained', async () => {
    mockAuthService.applyEmailChangeCode.mockRejectedValue({ code: 'auth/email-already-in-use' })
    renderPage('?mode=verifyAndChangeEmail&oobCode=c1')
    await waitFor(() => expect(screen.getByText(/ese correo ya tiene una cuenta en oqupa/i)).toBeDefined())
    expect(screen.queryByRole('link', { name: /solicitar un nuevo enlace/i })).toBeNull()
  })

  it('a used or expired link asks for a new one from Oqupa', async () => {
    mockAuthService.applyEmailChangeCode.mockRejectedValue({ code: 'auth/invalid-action-code' })
    renderPage('?mode=verifyAndChangeEmail&oobCode=c1')
    await waitFor(() => expect(screen.getByText('Este enlace ya no sirve. Pide uno nuevo desde Oqupa.')).toBeDefined())
  })

  // Hostile review 2026-10-24, finding 1: the undo link goes to the OLD,
  // mistyped address — possibly a stranger's. It must never be applied here.
  it('the undo link sent to the old address is explained, never applied', async () => {
    renderPage('?mode=recoverEmail&oobCode=r1')
    await waitFor(() => expect(screen.getByText(/no pediste este cambio/i)).toBeDefined())
    expect(screen.getByText(/admin@oqupa\.com/)).toBeDefined()
    expect(mockAuthService.applyRecoverEmailCode).not.toHaveBeenCalled()
    expect(screen.queryByRole('link', { name: /olvidaste tu contraseña/i })).toBeNull()
  })
})
