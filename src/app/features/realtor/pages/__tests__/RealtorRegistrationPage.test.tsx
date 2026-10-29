// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * realtor_application_submitted (metrics plan A3): fires once when the
 * application is written, never on a failed write, a validation error, or a
 * submit that turns out to be a duplicate.
 */

const { submittedMock, startedMock, submitApplicationMock, refreshUserMock, store } = vi.hoisted(() => {
  const store = { user: null as unknown }
  return {
    submittedMock: vi.fn(),
    startedMock: vi.fn(),
    submitApplicationMock: vi.fn(),
    refreshUserMock: vi.fn(),
    store,
  }
})

vi.mock('@/lib/analytics', () => ({
  AnalyticsLogger: {
    realtorApplicationSubmitted: submittedMock,
    realtorApplicationStarted: startedMock,
  },
}))
vi.mock('@/services/firestoreService', () => ({
  firestoreService: { submitRealtorApplication: submitApplicationMock },
}))
vi.mock('@/stores/authStore', () => {
  const useAuthStore = () => ({ user: store.user, refreshUser: refreshUserMock })
  useAuthStore.getState = () => ({ user: store.user })
  return { useAuthStore }
})
// jsdom has no <dialog>.showModal; the success modal's shell is not under test.
vi.mock('@/app/components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/app/components/ui')>()),
  Modal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div data-testid="success">{children}</div> : null,
}))

import RealtorRegistrationPage from '../RealtorRegistrationPage'

const USER = {
  id: 'u1',
  name: 'Ana Pérez',
  email: 'ana@example.com',
  isPhoneVerified: true,
  isVerifiedRealtor: false,
  realtorApplicationStatus: null,
  contactInfo: { whatsappPhoneNumber: '+51999888777' },
}

function renderPage() {
  return render(
    <MemoryRouter>
      <RealtorRegistrationPage />
    </MemoryRouter>,
  )
}

function fillAndSubmit({ motivation = 'Quiero ayudar a mis clientes a encontrar casa en Piura.' } = {}) {
  fireEvent.change(screen.getByLabelText(/Anos de experiencia/i), { target: { value: '5' } })
  fireEvent.change(screen.getByLabelText(/Zonas de servicio/i), { target: { value: 'Piura, Castilla' } })
  fireEvent.change(screen.getByLabelText(/Motivacion/i), { target: { value: motivation } })
  fireEvent.click(screen.getByRole('button', { name: /Enviar Solicitud/i }))
}

beforeEach(() => {
  submittedMock.mockReset()
  startedMock.mockReset()
  submitApplicationMock.mockReset().mockResolvedValue(undefined)
  refreshUserMock.mockReset().mockResolvedValue(undefined)
  store.user = USER
})

describe('realtor_application_submitted', () => {
  it('fires once, with no params, after a successful submit', async () => {
    renderPage()
    fillAndSubmit()
    await waitFor(() => expect(screen.getByTestId('success')).toBeTruthy())
    expect(submitApplicationMock).toHaveBeenCalledTimes(1)
    expect(submittedMock).toHaveBeenCalledTimes(1)
    expect(submittedMock).toHaveBeenCalledWith()
  })

  it('does not fire when the write fails', async () => {
    submitApplicationMock.mockRejectedValue(new Error('permission-denied'))
    renderPage()
    fillAndSubmit()
    await waitFor(() => expect(screen.getByText(/Error al enviar la solicitud/i)).toBeTruthy())
    expect(submittedMock).not.toHaveBeenCalled()
  })

  it('does not fire when validation fails', async () => {
    renderPage()
    fillAndSubmit({ motivation: 'corta' })
    await waitFor(() => expect(screen.getByText(/minimo 20 caracteres/i)).toBeTruthy())
    expect(submitApplicationMock).not.toHaveBeenCalled()
    expect(submittedMock).not.toHaveBeenCalled()
  })

  it('does not fire when an application is already pending (another tab)', async () => {
    renderPage()
    store.user = { ...USER, realtorApplicationStatus: 'pending' }
    fillAndSubmit()
    await waitFor(() => expect(refreshUserMock).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByRole('button', { name: /Enviar Solicitud/i })).toBeNull())
    expect(submitApplicationMock).not.toHaveBeenCalled()
    expect(submittedMock).not.toHaveBeenCalled()
  })
})

/**
 * realtor_application_started (metrics plan A8): once per visit, when the
 * person can still apply. Matches the app, which counts the incomplete-profile
 * screen too.
 */
describe('realtor_application_started', () => {
  it('fires once, with no params, for someone who never applied', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: /Enviar Solicitud/i })).toBeTruthy())
    expect(startedMock).toHaveBeenCalledTimes(1)
    expect(startedMock).toHaveBeenCalledWith()
  })

  it('fires for a rejected applicant, who can reapply', async () => {
    store.user = { ...USER, realtorApplicationStatus: 'rejected' }
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: /Enviar Solicitud/i })).toBeTruthy())
    expect(startedMock).toHaveBeenCalledTimes(1)
  })

  it('fires on the incomplete-profile screen', async () => {
    store.user = { ...USER, isPhoneVerified: false }
    renderPage()
    await waitFor(() => expect(screen.getByText(/Completa tu perfil primero/i)).toBeTruthy())
    expect(startedMock).toHaveBeenCalledTimes(1)
  })

  it('does not fire for a verified realtor', async () => {
    store.user = { ...USER, isVerifiedRealtor: true }
    renderPage()
    await waitFor(() => expect(screen.queryByRole('button', { name: /Enviar Solicitud/i })).toBeNull())
    expect(startedMock).not.toHaveBeenCalled()
  })

  it('does not fire while an application is pending', async () => {
    store.user = { ...USER, realtorApplicationStatus: 'pending' }
    renderPage()
    await waitFor(() => expect(screen.queryByRole('button', { name: /Enviar Solicitud/i })).toBeNull())
    expect(startedMock).not.toHaveBeenCalled()
  })

  it('fires only once when the user object changes during the visit', async () => {
    const { rerender } = renderPage()
    await waitFor(() => expect(startedMock).toHaveBeenCalledTimes(1))
    store.user = { ...USER, name: 'Ana María Pérez' }
    rerender(
      <MemoryRouter>
        <RealtorRegistrationPage />
      </MemoryRouter>,
    )
    store.user = { ...USER }
    rerender(
      <MemoryRouter>
        <RealtorRegistrationPage />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByRole('button', { name: /Enviar Solicitud/i })).toBeTruthy())
    expect(startedMock).toHaveBeenCalledTimes(1)
  })

  it('fires again on a new visit', async () => {
    const first = renderPage()
    await waitFor(() => expect(startedMock).toHaveBeenCalledTimes(1))
    first.unmount()
    renderPage()
    await waitFor(() => expect(startedMock).toHaveBeenCalledTimes(2))
  })

  it('a throwing logger does not break the page', async () => {
    startedMock.mockImplementation(() => { throw new Error('analytics down') })
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: /Enviar Solicitud/i })).toBeTruthy())
  })
})
