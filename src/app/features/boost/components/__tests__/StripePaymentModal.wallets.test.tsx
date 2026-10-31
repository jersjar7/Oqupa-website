// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * The website's payment form offers the same ways to pay as the app: card,
 * Link, Apple Pay and Google Pay (Jerson, 2026-10-31: "I want consistency
 * throughout the website and the flutter app"). Which ones show is decided by
 * the Stripe dashboard and the browser, as long as this form does not switch
 * the wallets off and builds the form from this payment's client secret (the
 * PaymentIntent the server made, in soles). The app pins its half in
 * boost_payment_sheet_wallets_test.dart.
 */

const { getStripeMock, elementsMock, createMock } = vi.hoisted(() => ({
  getStripeMock: vi.fn(),
  elementsMock: vi.fn(),
  createMock: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({ getStripe: getStripeMock }))
vi.mock('@/app/components/ui', () => ({
  Modal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
  Spinner: () => null,
}))

import StripePaymentModal from '../StripePaymentModal'

beforeEach(() => {
  createMock.mockReset().mockReturnValue({
    mount: vi.fn(),
    on: (event: string, cb: () => void) => {
      if (event === 'ready') cb()
    },
  })
  elementsMock.mockReset().mockReturnValue({ create: createMock })
  getStripeMock.mockReset().mockResolvedValue({ elements: elementsMock, confirmPayment: vi.fn() })
})

async function openForm() {
  render(
    <StripePaymentModal isOpen clientSecret="pi_123_secret_456" onSuccess={vi.fn()} onCancel={vi.fn()} onError={vi.fn()} />,
  )
  await screen.findByRole('button', { name: 'Pagar ahora' })
}

describe('StripePaymentModal — the same ways to pay as the app', () => {
  it('builds the form from this payment, so it charges what the server set (soles)', async () => {
    await openForm()
    expect(elementsMock).toHaveBeenCalledTimes(1)
    expect(elementsMock.mock.calls[0]![0]).toMatchObject({ clientSecret: 'pi_123_secret_456' })
  })

  it('is a Payment Element', async () => {
    await openForm()
    expect(createMock).toHaveBeenCalledWith('payment', expect.anything())
  })

  it('never switches Apple Pay or Google Pay off', async () => {
    await openForm()
    const options = (createMock.mock.calls[0]![1] ?? {}) as { wallets?: { applePay?: string; googlePay?: string } }
    expect(options.wallets?.applePay).not.toBe('never')
    expect(options.wallets?.googlePay).not.toBe('never')
  })

  it('does not narrow the form to a fixed list of methods (the dashboard decides)', async () => {
    await openForm()
    const elementsOptions = elementsMock.mock.calls[0]![0] as Record<string, unknown>
    expect(elementsOptions.paymentMethodTypes).toBeUndefined()
  })
})
