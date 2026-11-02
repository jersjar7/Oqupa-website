// @vitest-environment jsdom
// Hostile review 2026-11-02, item 6: with no confirm box (ADR-046 #9), the
// one password box on "Crea tu cuenta" must let the person see what they
// typed. Rendered with the real Input, not a stand-in.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/services/authService', () => ({ authService: {} }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: { getState: () => ({ refreshUser: () => Promise.resolve(), ensureProfile: () => Promise.resolve() }) } }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/app/features/listings/contactFunnel', () => ({
  CONTACT_GATE_STEPS: { signedIn: 'signed_in' },
  pendingContactErrand: vi.fn(),
  logContactMilestone: vi.fn(),
}))

import RegisterPage from '../RegisterPage'

describe('RegisterPage — the one password box can be shown', () => {
  it('has a show/hide toggle that reveals the password', () => {
    render(
      <MemoryRouter initialEntries={['/app/register?email=a%40b.co']}>
        <RegisterPage />
      </MemoryRouter>,
    )
    const box = document.querySelector('input[autocomplete="new-password"]') as HTMLInputElement
    expect(box.type).toBe('password')
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(box.type).toBe('text')
    expect(screen.getByRole('button', { name: 'Ocultar contraseña' })).toBeDefined()
  })
})
