// @vitest-environment jsdom
// Mi perfil (audit 2026-11-02, F; ADR-046 #15, #16): no "Identidad no
// verificada" row nobody can act on; Ayuda; CERRAR SESIÓN reachable on a
// phone; the deletion list in the app's words, "Guardados" not "favoritos".
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'u1', name: 'Ana Pérez', email: 'ana@example.com', isPhoneVerified: true, isIdentityVerified: false,
      isVerifiedRealtor: false, realtorApplicationStatus: null, createdAt: new Date('2026-01-01'),
      contactInfo: { whatsappPhoneNumber: '+51912345678', countryCode: 'PE', preferredContactTime: 'anytime', additionalNotes: '' },
    },
    refreshUser: vi.fn(),
  }),
}))
vi.mock('@/services/authService', () => ({ authService: { logout: vi.fn(), cleanupRecaptcha: vi.fn() } }))
vi.mock('@/app/components/shell/pageMetaContext', () => ({ useSetPageMeta: () => {} }))
vi.mock('@/app/components/ui/Modal', () => ({
  default: ({ isOpen, title, children }: { isOpen: boolean; title?: string; children: React.ReactNode }) =>
    isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null,
}))
vi.mock('@/app/components/ui', async (orig) => ({
  ...(await orig<typeof import('@/app/components/ui')>()),
  Modal: ({ isOpen, title, children }: { isOpen: boolean; title?: string; children: React.ReactNode }) =>
    isOpen ? <div role="dialog" aria-label={title}>{children}</div> : null,
}))

import ProfilePage from '../ProfilePage'

const renderPage = () => render(<MemoryRouter><ProfilePage /></MemoryRouter>)

describe('ProfilePage', () => {
  it('has no identity row', () => {
    renderPage()
    expect(screen.queryByText(/Identidad/)).toBeNull()
  })
  it('offers Ayuda and CERRAR SESIÓN, which asks first', () => {
    renderPage()
    expect(screen.getByRole('link', { name: /Ayuda/ }).getAttribute('href')).toBe('/app/ayuda')
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
    expect(screen.getByText('¿Estás seguro que deseas cerrar sesión?')).toBeTruthy()
  })
  it('the deletion list says Guardados, in the app words', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Eliminar cuenta/i }))
    expect(screen.getByText('Tus guardados e historial de visitas')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/favoritos/)
  })
})
