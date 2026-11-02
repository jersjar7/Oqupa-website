// @vitest-environment jsdom
// ADR-046 #13: "Cambiar contraseña" in Mi perfil for password accounts, with
// the app's three fields (Contraseña actual, Nueva contraseña, Confirmar
// nueva contraseña) and the same rule.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockAuthService = vi.hoisted(() => ({ changePasswordWithCurrent: vi.fn() }))
vi.mock('@/services/authService', () => ({ authService: mockAuthService }))
const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('sonner', () => ({ toast: mockToast }))

import ChangePasswordCard, { isPasswordAccount } from '../ChangePasswordCard'

function fill(current: string, next: string, confirm: string) {
  fireEvent.change(screen.getByLabelText('Contraseña actual'), { target: { value: current } })
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: next } })
  fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), { target: { value: confirm } })
  fireEvent.click(screen.getByRole('button', { name: /cambiar contraseña/i }))
}

function open() {
  render(<ChangePasswordCard />)
  fireEvent.click(screen.getByRole('button', { name: /cambiar contraseña/i }))
}

describe('ChangePasswordCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthService.changePasswordWithCurrent.mockResolvedValue(undefined)
  })

  it('only password accounts get it (Google-only accounts have no password)', () => {
    expect(isPasswordAccount({ providerData: [{ providerId: 'password' }] })).toBe(true)
    expect(isPasswordAccount({ providerData: [{ providerId: 'google.com' }] })).toBe(false)
    expect(isPasswordAccount({ providerData: [{ providerId: 'google.com' }, { providerId: 'password' }] })).toBe(true)
    expect(isPasswordAccount(null)).toBe(false)
  })

  it('shows the three fields once opened', () => {
    open()
    expect(screen.getByLabelText('Contraseña actual')).toBeDefined()
    expect(screen.getByLabelText('Nueva contraseña')).toBeDefined()
    expect(screen.getByLabelText('Confirmar nueva contraseña')).toBeDefined()
  })

  it('changes it with the current password, and says so', async () => {
    open()
    fill('Vieja123!', 'Contraseña 1!', 'Contraseña 1!')
    await waitFor(() =>
      expect(mockAuthService.changePasswordWithCurrent).toHaveBeenCalledWith('Vieja123!', 'Contraseña 1!'),
    )
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith('Contraseña cambiada correctamente'))
  })

  it('names what the new password is missing, and changes nothing', async () => {
    open()
    fill('Vieja123!', 'abcdefg1', 'abcdefg1')
    await waitFor(() =>
      expect(screen.getByText('Tu contraseña necesita una mayúscula y un símbolo.')).toBeDefined(),
    )
    expect(mockAuthService.changePasswordWithCurrent).not.toHaveBeenCalled()
  })

  it('refuses a confirmation that does not match', async () => {
    open()
    fill('Vieja123!', 'Contraseña 1!', 'Contraseña 2!')
    await waitFor(() => expect(screen.getByText('Las contraseñas no coinciden')).toBeDefined())
    expect(mockAuthService.changePasswordWithCurrent).not.toHaveBeenCalled()
  })

  it('refuses the same password', async () => {
    open()
    fill('Vieja123!', 'Vieja123!', 'Vieja123!')
    await waitFor(() => expect(screen.getByText('La nueva contraseña debe ser diferente')).toBeDefined())
  })

  it('a wrong current password is said under that field', async () => {
    mockAuthService.changePasswordWithCurrent.mockRejectedValue({ code: 'auth/invalid-credential' })
    open()
    fill('Mala123!', 'Contraseña 1!', 'Contraseña 1!')
    await waitFor(() => expect(screen.getByText('Tu contraseña actual no es correcta.')).toBeDefined())
    expect(mockToast.success).not.toHaveBeenCalled()
  })

  it('any other failure gets a Spanish sentence', async () => {
    mockAuthService.changePasswordWithCurrent.mockRejectedValue({ code: 'auth/network-request-failed' })
    open()
    fill('Vieja123!', 'Contraseña 1!', 'Contraseña 1!')
    await waitFor(() => expect(screen.getByText(/conexión a internet/i)).toBeDefined())
  })
})
