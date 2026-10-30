// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

/**
 * Metrics plan A9: the boost purchase events, website side. Same names,
 * fields and values as the app (boost_tier_selection_sheet.dart). The events
 * only observe — the flow must behave identically when analytics throws.
 */

const h = vi.hoisted(() => ({
  boostOfferViewed: vi.fn(),
  boostTierSelected: vi.fn(),
  boostCheckoutAbandoned: vi.fn(),
  createMutateAsync: vi.fn(),
  pollMutateAsync: vi.fn(),
  createPending: { value: false },
}))

vi.mock('@/lib/analytics', () => ({
  AnalyticsLogger: {
    boostOfferViewed: h.boostOfferViewed,
    boostTierSelected: h.boostTierSelected,
    boostCheckoutAbandoned: h.boostCheckoutAbandoned,
  },
}))
vi.mock('@/hooks/useBoost', () => ({
  useCreateBoostPayment: () => ({ mutateAsync: h.createMutateAsync, isPending: h.createPending.value }),
  usePollPaymentCompletion: () => ({ mutateAsync: h.pollMutateAsync }),
  useBoostTiers: () => ({ data: [] }),
}))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

// Fakes that expose every way each modal can hand control back.
vi.mock('../BoostTierSelectionModal', () => ({
  default: ({ isOpen, onClose, onConfirm }: {
    isOpen: boolean
    onClose: (tier: string) => void
    onConfirm: (tier: string) => void
  }) =>
    isOpen ? (
      <div data-testid="tier-modal">
        <button onClick={() => onClose('thirtyDays')}>tier:close</button>
        <button onClick={() => onConfirm('sevenDays')}>tier:confirm</button>
      </div>
    ) : null,
}))
vi.mock('../StripePaymentModal', () => ({
  default: ({ isOpen, onSuccess, onCancel, onError, onAbandon }: {
    isOpen: boolean
    onSuccess: () => void
    onCancel: () => void
    onError: (m: string) => void
    onAbandon?: () => void
  }) =>
    isOpen ? (
      <div data-testid="payment-modal">
        <button onClick={() => { onAbandon?.(); onCancel() }}>pay:abandon</button>
        <button onClick={onCancel}>pay:cancel-silent</button>
        <button onClick={onSuccess}>pay:success</button>
        <button onClick={() => onError('Tarjeta rechazada')}>pay:error</button>
      </div>
    ) : null,
}))

import BoostPurchaseFlow from '../BoostPurchaseFlow'

function setup(placement: 'my_listings' | 'listing_page' = 'my_listings') {
  const onSuccess = vi.fn()
  render(
    <BoostPurchaseFlow listingId="L1" placement={placement} onSuccess={onSuccess}>
      {(openFlow) => <button onClick={openFlow}>open</button>}
    </BoostPurchaseFlow>,
  )
  return { onSuccess }
}

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))

async function reachPayment() {
  click('open')
  await act(async () => click('tier:confirm'))
  expect(screen.getByTestId('payment-modal')).toBeTruthy()
}

describe('BoostPurchaseFlow — analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.createPending.value = false
    h.createMutateAsync.mockResolvedValue({ clientSecret: 'cs_1', paymentId: 'pay_1' })
    h.pollMutateAsync.mockResolvedValue(undefined)
  })
  afterEach(() => vi.useRealTimers())

  describe('boost_offer_viewed', () => {
    it.each(['my_listings', 'listing_page'] as const)('sends placement %s when the flow opens', (placement) => {
      setup(placement)
      expect(h.boostOfferViewed).not.toHaveBeenCalled()
      click('open')
      expect(h.boostOfferViewed).toHaveBeenCalledTimes(1)
      expect(h.boostOfferViewed).toHaveBeenCalledWith(placement)
    })

    it('sends once per opening', () => {
      setup()
      click('open')
      click('tier:close')
      click('open')
      expect(h.boostOfferViewed).toHaveBeenCalledTimes(2)
    })
  })

  describe('boost_tier_selected', () => {
    it('sends the BoostTier string before the payment is created', async () => {
      setup()
      click('open')
      await act(async () => click('tier:confirm'))
      expect(h.boostTierSelected).toHaveBeenCalledTimes(1)
      expect(h.boostTierSelected).toHaveBeenCalledWith('sevenDays')
      expect(h.boostTierSelected.mock.invocationCallOrder[0]!)
        .toBeLessThan(h.createMutateAsync.mock.invocationCallOrder[0]!)
    })
  })

  describe('boost_checkout_abandoned', () => {
    it('step tier_selection carries the highlighted tier', () => {
      setup()
      click('open')
      click('tier:close')
      expect(h.boostCheckoutAbandoned).toHaveBeenCalledTimes(1)
      expect(h.boostCheckoutAbandoned).toHaveBeenCalledWith('thirtyDays', 'tier_selection')
      expect(screen.queryByTestId('tier-modal')).toBeNull()
    })

    it('not when the tier modal closes while the confirmed payment is being created', () => {
      h.createPending.value = true
      setup()
      click('open')
      click('tier:close')
      expect(h.boostCheckoutAbandoned).not.toHaveBeenCalled()
    })

    it('step payment carries the confirmed tier', async () => {
      setup()
      await reachPayment()
      click('pay:abandon')
      expect(h.boostCheckoutAbandoned).toHaveBeenCalledTimes(1)
      expect(h.boostCheckoutAbandoned).toHaveBeenCalledWith('sevenDays', 'payment')
      // Flow unchanged: cancelling payment returns to tier selection.
      expect(screen.getByTestId('tier-modal')).toBeTruthy()
    })

    it('only once when the tier modal is closed after abandoning at payment, as in the app', async () => {
      setup()
      await reachPayment()
      click('pay:abandon')
      click('tier:close')
      expect(h.boostCheckoutAbandoned).toHaveBeenCalledTimes(1)
      expect(h.boostCheckoutAbandoned).toHaveBeenCalledWith('sevenDays', 'payment')
      expect(screen.queryByTestId('tier-modal')).toBeNull()
    })

    it('the guard resets each time the flow opens', async () => {
      setup()
      await reachPayment()
      click('pay:abandon')
      click('tier:close')

      click('open')
      click('tier:close')
      expect(h.boostCheckoutAbandoned).toHaveBeenCalledTimes(2)
      expect(h.boostCheckoutAbandoned).toHaveBeenLastCalledWith('thirtyDays', 'tier_selection')
    })

    it('not when the payment modal closes without the user abandoning (e.g. mid-submit)', async () => {
      setup()
      await reachPayment()
      click('pay:cancel-silent')
      expect(h.boostCheckoutAbandoned).not.toHaveBeenCalled()
    })

    it('never on success, the success screen closing, or its auto-close', async () => {
      vi.useFakeTimers()
      setup()
      await reachPayment()
      await act(async () => click('pay:success'))
      expect(screen.getByText('Tu publicación ahora está destacada')).toBeTruthy()
      click('Listo')

      click('open')
      await act(async () => click('tier:confirm'))
      await act(async () => click('pay:success'))
      act(() => { vi.advanceTimersByTime(4000) })
      expect(screen.queryByText('Tu publicación ahora está destacada')).toBeNull()

      expect(h.boostCheckoutAbandoned).not.toHaveBeenCalled()
    })

    it('never during processing (polling)', async () => {
      h.pollMutateAsync.mockReturnValue(new Promise(() => {}))
      setup()
      await reachPayment()
      await act(async () => click('pay:success'))
      expect(screen.getByText('Activando tu destacado...')).toBeTruthy()
      expect(h.boostCheckoutAbandoned).not.toHaveBeenCalled()
    })

    it('never on errors: payment creation failing, payment failing, or the error screen closing', async () => {
      h.createMutateAsync.mockRejectedValueOnce(new Error('internal'))
      setup()
      click('open')
      await act(async () => click('tier:confirm'))
      expect(screen.getByText('Error en el pago')).toBeTruthy()
      click('Cancelar')

      await reachPayment()
      click('pay:error')
      expect(screen.getByText('Tarjeta rechazada')).toBeTruthy()
      fireEvent.keyDown(document, { key: 'Escape' })

      expect(h.boostCheckoutAbandoned).not.toHaveBeenCalled()
    })
  })

  describe('analytics failures never break the purchase', () => {
    it('the whole flow completes when every analytics call throws', async () => {
      const boom = () => { throw new Error('analytics down') }
      h.boostOfferViewed.mockImplementation(boom)
      h.boostTierSelected.mockImplementation(boom)
      h.boostCheckoutAbandoned.mockImplementation(boom)
      const { onSuccess } = setup()

      click('open')
      click('tier:close')
      expect(screen.queryByTestId('tier-modal')).toBeNull()

      await reachPayment()
      expect(h.createMutateAsync).toHaveBeenCalledWith({ listingId: 'L1', boostTier: 'sevenDays' })
      click('pay:abandon')
      expect(screen.getByTestId('tier-modal')).toBeTruthy()

      await act(async () => click('tier:confirm'))
      await act(async () => click('pay:success'))
      expect(h.pollMutateAsync).toHaveBeenCalledWith('pay_1')
      expect(onSuccess).toHaveBeenCalledWith({ tier: 'sevenDays', durationDays: 7 })
    })
  })
})
