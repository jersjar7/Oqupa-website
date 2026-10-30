// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'

/**
 * Metrics plan A9: `onAbandon` fires when the user leaves the payment form
 * before paying — never while the payment is being submitted, and never when
 * the form failed to load (that is an error, not a choice).
 */

const { getStripeMock, confirmPaymentMock } = vi.hoisted(() => ({
  getStripeMock: vi.fn(),
  confirmPaymentMock: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({ getStripe: getStripeMock }))
// jsdom has no <dialog>.showModal; the shell exposes its close button.
vi.mock('@/app/components/ui', () => ({
  Modal: ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) =>
    isOpen ? (
      <div>
        <button onClick={onClose}>Cerrar ventana</button>
        {children}
      </div>
    ) : null,
  Spinner: () => null,
}))

import StripePaymentModal from '../StripePaymentModal'

function fakeStripe() {
  const element = {
    mount: vi.fn(),
    on: (event: string, cb: () => void) => { if (event === 'ready') cb() },
  }
  return {
    elements: () => ({ create: () => element }),
    confirmPayment: confirmPaymentMock,
  }
}

function setup() {
  const props = { onSuccess: vi.fn(), onCancel: vi.fn(), onError: vi.fn(), onAbandon: vi.fn() }
  render(<StripePaymentModal isOpen clientSecret="cs_1" {...props} />)
  return props
}

describe('StripePaymentModal — onAbandon', () => {
  beforeEach(() => {
    getStripeMock.mockReset()
    confirmPaymentMock.mockReset()
    getStripeMock.mockResolvedValue(fakeStripe())
  })

  it('fires on the Cancelar button, alongside onCancel', async () => {
    const props = setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))
    expect(props.onAbandon).toHaveBeenCalledTimes(1)
    expect(props.onCancel).toHaveBeenCalledTimes(1)
  })

  it('fires when the modal itself is closed', async () => {
    const props = setup()
    await screen.findByRole('button', { name: 'Pagar ahora' })
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ventana' }))
    expect(props.onAbandon).toHaveBeenCalledTimes(1)
    expect(props.onCancel).toHaveBeenCalledTimes(1)
  })

  it('does not fire when closed while the payment is being submitted', async () => {
    let resolvePayment: (v: { error?: undefined }) => void = () => {}
    confirmPaymentMock.mockReturnValue(new Promise((r) => { resolvePayment = r }))
    const props = setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Pagar ahora' }))
    await screen.findByText('Procesando pago...')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ventana' }))
    expect(props.onCancel).toHaveBeenCalledTimes(1)
    expect(props.onAbandon).not.toHaveBeenCalled()

    await act(async () => resolvePayment({}))
    expect(props.onSuccess).toHaveBeenCalledTimes(1)
  })

  it('does not fire on success or on a payment error', async () => {
    confirmPaymentMock
      .mockResolvedValueOnce({ error: { type: 'card_error', message: 'Tarjeta rechazada' } })
      .mockResolvedValueOnce({})
    const props = setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Pagar ahora' }))
    await waitFor(() => expect(props.onError).toHaveBeenCalledWith('Tarjeta rechazada'))
    fireEvent.click(await screen.findByRole('button', { name: 'Pagar ahora' }))
    await waitFor(() => expect(props.onSuccess).toHaveBeenCalledTimes(1))
    expect(props.onAbandon).not.toHaveBeenCalled()
  })

  it('does not fire when closing after the form failed to load', async () => {
    getStripeMock.mockResolvedValue(null)
    const props = setup()
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ventana' }))
    expect(props.onCancel).toHaveBeenCalledTimes(2)
    expect(props.onAbandon).not.toHaveBeenCalled()
  })
})
