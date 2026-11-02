// @vitest-environment jsdom
// Pagos (audit 2026-11-02, F.5; ADR-046 #18 web half): a reference to quote,
// a load error that says why and retries in place, refund controls that are
// real buttons, and the app's words around the refund.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const state = vi.hoisted(() => ({
  payments: { data: [] as unknown[], isLoading: false, error: null as unknown, refetch: vi.fn() },
  refund: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: state.toast }))
vi.mock('@/stores/authStore', () => ({ useAuthStore: () => ({ user: { id: 'u1' } }) }))
vi.mock('@/hooks/useBoost', () => ({
  useUserBoostPayments: () => state.payments,
  useRefundBoostPayment: () => ({ mutateAsync: state.refund, isPending: false }),
}))
vi.mock('@/lib/analytics', () => ({ AnalyticsLogger: { boostRefund: vi.fn() } }))

import PaymentHistoryPage from '../PaymentHistoryPage'

const PAYMENT = {
  id: 'pay_ABC123', amount: 29.9, currency: 'PEN', status: 'completed', provider: 'stripe', method: 'card',
  description: 'Destacar publicación', paymentPurpose: 'boost', listingId: 'L1', boostTier: 'sevenDays', userId: 'u1',
  stripePaymentIntentId: 'pi_1', createdAt: new Date(), updatedAt: new Date(), completedAt: new Date(),
}

const renderPage = () => render(<MemoryRouter><PaymentHistoryPage /></MemoryRouter>)

describe('PaymentHistoryPage', () => {
  beforeEach(() => {
    state.payments = { data: [PAYMENT], isLoading: false, error: null, refetch: vi.fn() }
    state.refund.mockReset()
    state.toast.success.mockReset()
  })

  it('shows a reference to quote, as the app does', () => {
    renderPage()
    expect(screen.getByText('Referencia: pay_ABC123')).toBeTruthy()
  })

  it('a failed load says why and retries in place', () => {
    state.payments = { data: undefined as unknown as unknown[], isLoading: false, error: new Error('x'), refetch: vi.fn() }
    renderPage()
    expect(screen.getByText('No pudimos cargar tus pagos. Revisa tu internet y vuelve a intentarlo.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(state.payments.refetch).toHaveBeenCalled()
  })

  it('refund: the app words, then the app success message', async () => {
    state.refund.mockResolvedValue(undefined)
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /Solicitar reembolso/ }))
    expect(screen.getByText(/se reembolsará el pago a tu método de pago original/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar reembolso' }))
    await waitFor(() =>
      expect(state.toast.success).toHaveBeenCalledWith('Reembolso procesado. Se quitaron de tu destacado los días de esta compra.'),
    )
  })
})
