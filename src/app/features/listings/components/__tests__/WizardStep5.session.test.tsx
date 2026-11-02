// @vitest-environment jsdom
// ADR-043 step 3, bug 17: signed out in the middle of the wizard, PUBLICAR did
// nothing at all. Now it says so and offers INICIAR SESIÓN, which comes back
// to the wizard after signing in, with the draft still there.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const fb = vi.hoisted(() => ({ auth: { currentUser: { uid: 'owner-1' } as null | { uid: string } } }))
vi.mock('@/lib/firebase', () => ({ db: {}, functions: {}, storage: {}, auth: fb.auth }))
vi.mock('@/lib/analytics', () => ({ AnalyticsLogger: new Proxy({}, { get: () => () => {} }) }))
vi.mock('@/components/ShareFormatModal', () => ({ default: () => null }))
const publish = vi.hoisted(() => vi.fn())
vi.mock('@/services/publishService', async (orig) => ({
  ...(await orig<typeof import('@/services/publishService')>()),
  publishListing: publish,
}))

import WizardStep5 from '../WizardStep5'
import { useListingFormStore } from '@/stores/listingFormStore'
import { useAuthStore } from '@/stores/authStore'
import { consumeReturnUrl } from '@/lib/utils'
import { PublishError } from '@/services/publishService'

const MESSAGE = 'Tu sesión se cerró. Inicia sesión para publicar.'

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

function renderStep() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/app/listings/new']}>
        <Routes>
          <Route path="/app/listings/new" element={<WizardStep5 />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const signedInUser = {
  id: 'owner-1', email: 'o@x.pe', name: 'Ana', createdAt: new Date('2025-01-01'),
  updatedAt: new Date(), isActive: true, isPhoneVerified: true, isIdentityVerified: false,
  isVerifiedRealtor: false, claimsThisMonth: 0, claimMonth: '2026-11',
  contactInfo: { phoneNumber: '+51999999999' },
}

describe('WizardStep5 — the session closed before PUBLICAR', () => {
  beforeEach(() => {
    window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as unknown as typeof window.matchMedia
    Element.prototype.scrollIntoView = vi.fn()
    sessionStorage.clear()
    localStorage.clear()
    publish.mockReset()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    fb.auth.currentUser = { uid: 'owner-1' }
    useAuthStore.setState({ user: signedInUser } as never)
    useListingFormStore.getState().reset()
    useListingFormStore.getState().updateData({
      propertyType: 'terreno', operationType: 'venta', role: 'owner',
      description: 'Terreno amplio con todos los servicios cerca de la avenida',
      totalAreaInSquareMeters: 200, latitude: -5.19, longitude: -80.63,
      calle: 'Av. Grau 123', distrito: 'Piura', provincia: 'Piura', departamento: 'Piura',
      amount: 50000, currency: 'USD',
      photos: [new File(['a'], 'a.jpg', { type: 'image/jpeg' })],
    })
    useListingFormStore.getState().setStep(5)
  })

  it('signed out (no profile): PUBLICAR says so instead of doing nothing', async () => {
    useAuthStore.setState({ user: null } as never)
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /publicar/i }))
    expect(await screen.findByText(MESSAGE)).toBeTruthy()
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeTruthy()
    expect(publish).not.toHaveBeenCalled()
  })

  it('INICIAR SESIÓN goes to sign-in and comes back to the wizard, draft kept', async () => {
    useAuthStore.setState({ user: null } as never)
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /publicar/i }))
    fireEvent.click(await screen.findByRole('button', { name: /iniciar sesión/i }))
    await waitFor(() => expect(screen.getByTestId('where').textContent).toBe('/app/login'))
    // Where the sign-in page sends the person once signed in (GuestGuard).
    expect(consumeReturnUrl()).toBe('/app/listings/new')
    const saved = JSON.parse(sessionStorage.getItem('oqupa-listing-form') ?? '{}')
    expect(saved.description).toBe('Terreno amplio con todos los servicios cerca de la avenida')
    expect(saved.amount).toBe(50000)
    expect(saved.step).toBe(5)
  })

  it('a publish refused because the session ended offers INICIAR SESIÓN too', async () => {
    publish.mockRejectedValue(new PublishError(new Error('x'), { online: true, signedIn: false }))
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /publicar/i }))
    expect(await screen.findByRole('button', { name: /iniciar sesión/i }, { timeout: 3000 })).toBeTruthy()
  })

  it('signed in: no such message', async () => {
    publish.mockReturnValue(new Promise(() => {}))
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /publicar/i }))
    await waitFor(() => expect(publish).toHaveBeenCalled())
    expect(screen.queryByText(MESSAGE)).toBeNull()
  })
})
