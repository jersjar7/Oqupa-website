// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ── Mocks ───────────────────────────────────────────────────────────────────

const mockAuthService = vi.hoisted(() => ({
  verifySetPasswordCode: vi.fn(),
  confirmSetPassword: vi.fn(),
}))

vi.mock('@/services/authService', () => ({
  authService: mockAuthService,
}))

vi.mock('@/app/components/ui', () => ({
  Input: ({ label, error, revealToggle: _rt, ...props }: any) => (
    <>
      <input aria-label={label} {...props} />
      {error && <span role="alert">{error}</span>}
    </>
  ),
  Button: ({ children, isLoading, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

// ── Import after mocks ──────────────────────────────────────────────────────

import SetPasswordPage from '../SetPasswordPage'

// ── Helpers ─────────────────────────────────────────────────────────────────

function renderPage(search = '?oobCode=valid-code') {
  return render(
    <MemoryRouter initialEntries={[`/app/set-password${search}`]}>
      <Routes>
        <Route path="/app/set-password" element={<SetPasswordPage />} />
        <Route path="/app" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('SetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('verifying state', () => {
    it('shows verifying message while oobCode is being checked', () => {
      mockAuthService.verifySetPasswordCode.mockReturnValue(new Promise(() => {}))
      renderPage()
      expect(screen.getByText(/verificando enlace/i)).toBeDefined()
    })
  })

  describe('invalid state', () => {
    it('shows invalid state when no oobCode is present', async () => {
      renderPage('') // no search params
      await waitFor(() => {
        expect(screen.getByText(/enlace inv/i)).toBeDefined()
      })
    })

    it('shows invalid state when verifySetPasswordCode throws', async () => {
      mockAuthService.verifySetPasswordCode.mockRejectedValue(new Error('expired'))
      renderPage()
      await waitFor(() => {
        expect(screen.getByText(/expir/i)).toBeDefined()
      })
    })

    it('shows link to request a new code', async () => {
      renderPage('')
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /nuevo enlace/i })).toBeDefined()
      })
    })
  })

  describe('ready state', () => {
    beforeEach(() => {
      mockAuthService.verifySetPasswordCode.mockResolvedValue('user@example.com')
    })

    it('shows the user email once code is verified', async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('user@example.com')).toBeDefined()
      })
    })

    it('renders password and confirm password fields', async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByLabelText(/nueva contrase/i)).toBeDefined()
        expect(screen.getByLabelText(/confirma/i)).toBeDefined()
      })
    })
  })

  describe('submit error handling', () => {
    beforeEach(() => {
      mockAuthService.verifySetPasswordCode.mockResolvedValue('user@example.com')
    })

    it('shows expired error message', async () => {
      mockAuthService.confirmSetPassword.mockRejectedValue(
        new Error('expired-action-code')
      )
      renderPage()
      await waitFor(() => screen.getByLabelText(/nueva contrase/i))

      fireEvent.change(screen.getByLabelText(/nueva contrase/i), {
        target: { value: 'newpassword123' },
      })
      fireEvent.change(screen.getByLabelText(/confirma/i), {
        target: { value: 'newpassword123' },
      })
      fireEvent.submit(document.querySelector('form')!)

      await waitFor(() => {
        expect(screen.getByText(/expir/i)).toBeDefined()
      })
    })

    it('shows weak password error message', async () => {
      mockAuthService.confirmSetPassword.mockRejectedValue(
        new Error('weak-password')
      )
      renderPage()
      await waitFor(() => screen.getByLabelText(/nueva contrase/i))

      fireEvent.change(screen.getByLabelText(/nueva contrase/i), {
        target: { value: 'newpassword123' },
      })
      fireEvent.change(screen.getByLabelText(/confirma/i), {
        target: { value: 'newpassword123' },
      })
      fireEvent.submit(document.querySelector('form')!)

      await waitFor(() => {
        expect(screen.getByText(/d.bil/i)).toBeDefined()
      })
    })
  })
})
