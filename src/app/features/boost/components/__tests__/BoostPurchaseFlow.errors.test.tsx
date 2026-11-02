// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

/**
 * What the owner reads when the server refuses to start a boost checkout.
 * The callable's error carries a code ('functions/already-exists'), the
 * server's message and, for already-exists, `details.reason`. The old check
 * looked for code names inside the message text, which never contains them,
 * so every refusal showed the generic "Error al procesar el pago".
 */

const h = vi.hoisted(() => ({ createMutateAsync: vi.fn(), invalidateQueries: vi.fn() }))

vi.mock('@/lib/analytics', () => ({
  AnalyticsLogger: { boostOfferViewed: vi.fn(), boostTierSelected: vi.fn(), boostCheckoutAbandoned: vi.fn() },
}))
vi.mock('@/hooks/useBoost', () => ({
  useCreateBoostPayment: () => ({ mutateAsync: h.createMutateAsync, isPending: false }),
  usePollPaymentCompletion: () => ({ mutateAsync: vi.fn() }),
  useBoostTiers: () => ({ data: [] }),
}))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: h.invalidateQueries }) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
vi.mock('../BoostTierSelectionModal', () => ({
  default: ({ isOpen, onConfirm, notice }: { isOpen: boolean; onConfirm: (tier: string) => void; notice?: string }) =>
    isOpen ? (
      <div data-testid="tier-modal">
        {notice && <p data-testid="tier-notice">{notice}</p>}
        <button onClick={() => onConfirm('sevenDays')}>tier:confirm</button>
      </div>
    ) : null,
}))
vi.mock('../StripePaymentModal', () => ({ default: () => null }))

import BoostPurchaseFlow from '../BoostPurchaseFlow'

/** An error shaped like the Firebase SDK's FunctionsError. */
const functionsError = (code: string, message: string, details?: unknown) =>
  Object.assign(new Error(message), { code: `functions/${code}`, details })

async function refuseWith(error: unknown) {
  h.createMutateAsync.mockRejectedValueOnce(error)
  render(
    <BoostPurchaseFlow listingId="L1" placement="my_listings" onSuccess={vi.fn()}>
      {(openFlow) => <button onClick={openFlow}>open</button>}
    </BoostPurchaseFlow>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'open' }))
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'tier:confirm' }))
  })
}

describe('BoostPurchaseFlow — refused checkout messages', () => {
  beforeEach(() => h.createMutateAsync.mockReset())

  it('tells the owner a payment is already in progress, not that the listing is boosted', async () => {
    await refuseWith(functionsError('already-exists',
      'Ya tienes un pago en proceso para esta publicación. Espera a que termine.',
      { reason: 'paymentInProgress' }))
    expect(screen.getByText('Ya tienes un pago en proceso para esta publicación. Espera a que termine.')).toBeTruthy()
    expect(screen.queryByText('Esta publicación ya está destacada')).toBeNull()
  })

  it('says the listing is already boosted when it is', async () => {
    await refuseWith(functionsError('already-exists', 'Listing is already boosted', { reason: 'alreadyBoosted' }))
    expect(screen.getByText('Esta publicación ya está destacada')).toBeTruthy()
  })

  it('recognises a payment in progress from a server without the reason yet', async () => {
    await refuseWith(functionsError('already-exists',
      'Ya tienes un pago en proceso para esta publicacion. Espera a que termine.'))
    expect(screen.getByText('Ya tienes un pago en proceso para esta publicación. Espera a que termine.')).toBeTruthy()
  })

  it('maps the other refusals by their code', async () => {
    await refuseWith(functionsError('permission-denied', 'You can only boost your own listings'))
    expect(screen.getByText('Solo puedes destacar tus propias publicaciones')).toBeTruthy()
  })

  it('falls back to the generic message for anything else', async () => {
    await refuseWith(new Error('network down'))
    expect(screen.getByText('Error al procesar el pago. Intenta de nuevo.')).toBeTruthy()
  })

  // One boost only (ADR-043 D16): a tier no longer sold (an older page still
  // open in a tab) is refused with invalid-argument + details.reason
  // 'tierNotOnSale'. The owner reads the server's Spanish sentence and lands
  // back on the 30-day option, so one tap continues.
  describe('a tier that is no longer sold', () => {
    const ONE_BOOST = 'Ahora el destacado es de 30 días por S/ 29.90. Elige 30 días para continuar.'

    it('shows the server sentence on the 30-day option, not the generic error', async () => {
      await refuseWith(functionsError('invalid-argument', ONE_BOOST, { reason: 'tierNotOnSale' }))
      expect(screen.getByTestId('tier-modal')).toBeTruthy()
      expect(screen.getByTestId('tier-notice').textContent).toBe(ONE_BOOST)
      expect(screen.queryByText('Error al procesar el pago. Intenta de nuevo.')).toBeNull()
    })

    it('refreshes the price on offer', async () => {
      await refuseWith(functionsError('invalid-argument', ONE_BOOST, { reason: 'tierNotOnSale' }))
      expect(h.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['config', 'boostTiers'] })
    })

    it('quotes a changed price the server sends', async () => {
      const other = 'Ahora el destacado es de 30 días por S/ 24.90. Elige 30 días para continuar.'
      await refuseWith(functionsError('invalid-argument', other, { reason: 'tierNotOnSale' }))
      expect(screen.getByTestId('tier-notice').textContent).toBe(other)
    })

    it('never passes through other server text under that reason', async () => {
      await refuseWith(functionsError('invalid-argument', 'Tier sevenDays is not on sale', { reason: 'tierNotOnSale' }))
      expect(screen.queryByText(/Tier sevenDays/)).toBeNull()
      expect(screen.getByTestId('tier-notice').textContent).toBe(ONE_BOOST)
    })

    it('an invalid-argument without that reason stays the generic error', async () => {
      await refuseWith(functionsError('invalid-argument', 'Esta opción de destacado ya no está disponible.'))
      expect(screen.getByText('Error al procesar el pago. Intenta de nuevo.')).toBeTruthy()
      expect(screen.queryByTestId('tier-modal')).toBeNull()
    })
  })
})
