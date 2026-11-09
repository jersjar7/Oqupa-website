// @vitest-environment jsdom
// Review 2026-11-09 (ADR-056): someone verifying from Perfil can be stuck at
// the phone step too, so their failures reach the team like the pipeline's.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const account = vi.hoisted(() => ({ phoneVerified: false }))
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'u1', name: 'Ana Pérez', email: 'ana@example.com', isPhoneVerified: account.phoneVerified, isIdentityVerified: false,
      isVerifiedRealtor: false, realtorApplicationStatus: null, createdAt: new Date('2026-01-01'),
      contactInfo: { whatsappPhoneNumber: '+51912345678', countryCode: 'PE', preferredContactTime: 'anytime', additionalNotes: '' },
    },
    refreshUser: vi.fn(),
  }),
}))
const mockSend = vi.hoisted(() => vi.fn())
vi.mock('@/services/authService', () => ({ authService: { logout: vi.fn(), cleanupRecaptcha: vi.fn(), initializeRecaptcha: vi.fn(), sendPhoneVerificationCode: mockSend } }))
const mockReport = vi.hoisted(() => vi.fn())
vi.mock('@/services/phoneStepFailures', () => ({ reportPhoneStepFailure: mockReport }))
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

describe('ProfilePage — phone failures reach the team', () => {
  it('a refused send is reported and says what works', async () => {
    mockSend.mockRejectedValue({ code: 'auth/too-many-requests' })
    render(<MemoryRouter><ProfilePage /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /verificar ahora/i }))
    fireEvent.change(screen.getByPlaceholderText('912 345 678'), { target: { value: '912345678' } })
    fireEvent.click(screen.getByRole('button', { name: /enviar código/i }))
    await waitFor(() => expect(mockReport).toHaveBeenCalledWith({ code: 'auth/too-many-requests', step: 'send' }))
    expect(screen.getAllByText(/Google está bloqueando los códigos desde tu conexión de internet/).length).toBeGreaterThan(0)
  })
})
