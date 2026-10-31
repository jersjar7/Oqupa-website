// What an owner sees for each boost payment on "Mis pagos" (audit 2026-10-31):
// Spanish only, a dispute is not a "failed" payment, a partial refund says so,
// and the refund button appears only where the server will accept it.
import { describe, it, expect } from 'vitest'
import { paymentStatusDisplay, isRefundEligible, refundErrorMessage } from '../paymentDisplay'
import type { Payment } from '@/types/boost'

const HOUR = 60 * 60 * 1000
const now = new Date('2026-10-31T12:00:00Z').getTime()

function pay(over: Partial<Payment> = {}): Payment {
  return {
    id: 'p', amount: 9.9, currency: 'PEN', status: 'completed', provider: 'stripe', method: 'card',
    description: '', paymentPurpose: 'listingBoost', listingId: 'l', boostTier: 'sevenDays', userId: 'u',
    stripePaymentIntentId: 'pi', createdAt: new Date(now - HOUR), updatedAt: new Date(now - HOUR),
    completedAt: new Date(now - HOUR), ...over,
  }
}

describe('paymentStatusDisplay', () => {
  it('a completed payment says Completado', () => {
    expect(paymentStatusDisplay(pay()).label).toBe('Completado')
  })
  it('an open dispute says En disputa, not Fallido', () => {
    expect(paymentStatusDisplay(pay({ status: 'failed', disputeId: 'dp', disputeStatus: 'needs_response' })).label).toBe('En disputa')
  })
  it('a lost dispute says Disputa perdida', () => {
    expect(paymentStatusDisplay(pay({ status: 'failed', disputeId: 'dp', disputeStatus: 'lost' })).label).toBe('Disputa perdida')
  })
  it('a partly refunded payment says how much came back', () => {
    const d = paymentStatusDisplay(pay({ partiallyRefunded: true, refundedAmount: 4 }))
    expect(d.label).toBe('Reembolso parcial')
    expect(d.detail).toBe('Te devolvimos S/. 4.00')
  })
  it('a refunded payment says Reembolsado', () => {
    expect(paymentStatusDisplay(pay({ status: 'refunded' })).label).toBe('Reembolsado')
  })
  it('an unknown status from a newer server still shows Spanish, never the raw value', () => {
    const d = paymentStatusDisplay(pay({ status: 'refunding' as Payment['status'] }))
    expect(d.label).toBe('Procesando')
  })
})

describe('isRefundEligible', () => {
  it('within 48 hours of its own completion', () => {
    expect(isRefundEligible(pay(), now)).toBe(true)
  })
  it('not after 48 hours', () => {
    expect(isRefundEligible(pay({ completedAt: new Date(now - 49 * HOUR) }), now)).toBe(false)
  })
  it('not once part of it was refunded', () => {
    expect(isRefundEligible(pay({ partiallyRefunded: true, refundedAmount: 4 }), now)).toBe(false)
  })
  it('not while disputed or already refunded', () => {
    expect(isRefundEligible(pay({ status: 'failed', disputeId: 'dp' }), now)).toBe(false)
    expect(isRefundEligible(pay({ status: 'refunded' }), now)).toBe(false)
  })
})

describe('refundErrorMessage', () => {
  // Firebase puts the code on err.code ("functions/failed-precondition") and the
  // server's English sentence in err.message; the page used to read only the
  // message, so every refusal showed the generic text.
  it('reads the code, not the English message', () => {
    const err = Object.assign(new Error('Refunds are only available within 48 hours of purchase.'), { code: 'functions/failed-precondition' })
    expect(refundErrorMessage(err)).toBe('Este pago ya no se puede reembolsar.')
  })
  it('permission and sign-in', () => {
    expect(refundErrorMessage({ code: 'functions/permission-denied' })).toBe('Solo puedes solicitar reembolso de tus propios pagos')
    expect(refundErrorMessage({ code: 'functions/unauthenticated' })).toBe('Debes iniciar sesión para solicitar un reembolso')
  })
  it('anything else is a Spanish retry message', () => {
    expect(refundErrorMessage(new Error('boom'))).toBe('Error al procesar el reembolso. Intenta de nuevo.')
  })
})
