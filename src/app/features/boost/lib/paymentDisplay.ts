// What an owner sees for a boost payment on "Mis pagos". Spanish only — the
// server's English error text is never shown — and a dispute is not called a
// failed payment (audit 2026-10-31). Mirrors the app's payment history.
import type { Payment } from '@/types/boost'
import { PAYMENT_STATUS_LABELS } from '@/types/boost'

export type StatusTone = 'pending' | 'success' | 'danger' | 'muted' | 'info'

export interface StatusDisplay {
  label: string
  tone: StatusTone
  /** A second line under the amount, when there is something to add. */
  detail?: string
}

const REFUND_WINDOW_MS = 48 * 60 * 60 * 1000

const soles = (n: number) => `S/. ${n.toFixed(2)}`

export function paymentStatusDisplay(payment: Payment): StatusDisplay {
  if (payment.disputeId && payment.status === 'failed') {
    if (payment.disputeStatus === 'lost') return { label: 'Disputa perdida', tone: 'danger' }
    return { label: 'En disputa', tone: 'pending', detail: 'Tu banco está revisando este cobro.' }
  }
  if (payment.status === 'completed' && payment.partiallyRefunded) {
    return {
      label: 'Reembolso parcial',
      tone: 'info',
      detail: payment.refundedAmount != null ? `Te devolvimos ${soles(payment.refundedAmount)}` : undefined,
    }
  }
  const tones: Record<string, StatusTone> = {
    pending: 'pending', completed: 'success', failed: 'danger', cancelled: 'muted', refunded: 'info', expired: 'muted',
  }
  const label = (PAYMENT_STATUS_LABELS as Record<string, string>)[payment.status]
  // A status this page does not know yet (a newer server) is still Spanish.
  return label ? { label, tone: tones[payment.status] ?? 'muted' } : { label: 'Procesando', tone: 'pending' }
}

/** The same rule the server applies: this payment's own completion, 48 hours. */
export function isRefundEligible(payment: Payment, now: number = Date.now()): boolean {
  if (payment.status !== 'completed' || payment.partiallyRefunded || payment.disputeId) return false
  if (!payment.completedAt) return false
  return now - payment.completedAt.getTime() < REFUND_WINDOW_MS
}

/** Spanish message for a refused refund, read from the error's code. */
export function refundErrorMessage(err: unknown): string {
  const code = String((err as { code?: string } | null)?.code ?? '')
  if (code.endsWith('unauthenticated')) return 'Debes iniciar sesión para solicitar un reembolso'
  if (code.endsWith('not-found')) return 'Pago no encontrado'
  if (code.endsWith('permission-denied')) return 'Solo puedes solicitar reembolso de tus propios pagos'
  if (code.endsWith('failed-precondition')) return 'Este pago ya no se puede reembolsar.'
  return 'Error al procesar el reembolso. Intenta de nuevo.'
}
