// @vitest-environment jsdom
// ADR-060 (Jerson, 2026-11-13: "Fix names"): Mi perfil saves the name
// capitalized and the box then shows it as saved; the phone keyboard offers a
// capital at each word and autocorrect leaves names alone.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const updateUserName = vi.hoisted(() => vi.fn(async () => 'Juan Pérez'))
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'u1', name: 'Ana Pérez', email: 'ana@example.com', isPhoneVerified: true, isIdentityVerified: false,
      isVerifiedRealtor: false, realtorApplicationStatus: null, createdAt: new Date('2026-01-01'),
      contactInfo: null,
    },
    refreshUser: vi.fn(async () => {}),
  }),
}))
vi.mock('@/services/authService', () => ({
  authService: { logout: vi.fn(), cleanupRecaptcha: vi.fn(), updateUserName },
}))
vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: () => {} }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import ProfilePage from '../ProfilePage'

const renderPage = () => render(<MemoryRouter><ProfilePage /></MemoryRouter>)

describe('ProfilePage — names (ADR-060)', () => {
  it('the name box asks for capitals and no autocorrect', () => {
    renderPage()
    const box = screen.getByLabelText('Nombre completo')
    expect(box.getAttribute('autocapitalize')).toBe('words')
    expect(box.getAttribute('autocorrect')).toBe('off')
  })

  it('after saving, the box shows the name as saved', async () => {
    renderPage()
    const box = screen.getByLabelText('Nombre completo') as HTMLInputElement
    fireEvent.change(box, { target: { value: 'juan pérez' } })
    fireEvent.submit(box.closest('form')!)
    await waitFor(() => expect(updateUserName).toHaveBeenCalledWith('u1', 'juan pérez'))
    await waitFor(() => expect(box.value).toBe('Juan Pérez'))
  })
})
