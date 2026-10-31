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

const h = vi.hoisted(() => ({ createMutateAsync: vi.fn() }))

vi.mock('@/lib/analytics', () => ({
  AnalyticsLogger: { boostOfferViewed: vi.fn(), boostTierSelected: vi.fn(), boostCheckoutAbandoned: vi.fn() },
}))
vi.mock('@/hooks/useBoost', () => ({
  useCreateBoostPayment: () => ({ mutateAsync: h.createMutateAsync, isPending: false }),
  usePollPaymentCompletion: () => ({ mutateAsync: vi.fn() }),
  useBoostTiers: () => ({ data: [] }),
}))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))
vi.mock('../BoostTierSelectionModal', () => ({
  default: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: (tier: string) => void }) =>
    isOpen ? <button onClick={() => onConfirm('sevenDays')}>tier:confirm</button> : null,
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
})
