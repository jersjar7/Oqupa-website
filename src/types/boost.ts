// Types for the boost payment system
// Mirrors the Flutter domain models and Cloud Function API contracts

export type BoostTier = 'sevenDays' | 'fifteenDays' | 'thirtyDays'

export interface BoostTierConfiguration {
  tier: BoostTier
  durationDays: number
  feeInSoles: number
  feeInCentimos: number
  displayName: string
}

/** Response from the createBoostPaymentIntent Cloud Function */
export interface BoostPaymentInitiation {
  clientSecret: string
  paymentId: string
}

/** Payment document from Firestore (payments/{paymentId}) */
export interface Payment {
  id: string
  amount: number
  currency: string
  status: PaymentDocStatus
  provider: string
  /** How it was paid: card | link | apple_pay | google_pay (no personal data). */
  method: string
  description: string
  paymentPurpose: string
  listingId: string
  boostTier: BoostTier
  userId: string
  stripePaymentIntentId: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  expiresAt?: Date
  /** Refund details, written by the server (audit 2026-10-31). */
  refundedAt?: Date
  refundedAmount?: number
  partiallyRefunded?: boolean
  /** Set when the payer disputed the charge with their bank. */
  disputeId?: string
  disputeStatus?: string
}

export type PaymentDocStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'expired'

/**
 * The one boost on sale: 30 days at S/ 29.90 (ADR-042, ADR-043 D16).
 * 7 and 15 days stay in `BoostTier` and `BOOST_TIER_LABELS` only so past
 * purchases still read correctly in payment history.
 */
export const ON_SALE_BOOST_TIER: BoostTier = 'thirtyDays'

/**
 * Sent as `offer` with createBoostPaymentIntent: this page offers only the one
 * boost. Must match ONE_BOOST_OFFER in the functions' lib/boost-tiers.js.
 */
export const ONE_BOOST_OFFER = 'one-boost' as const

/** What a new purchase may choose (fallback when Firestore config/pricing is unavailable). */
export const DEFAULT_BOOST_TIERS: BoostTierConfiguration[] = [
  {
    tier: 'thirtyDays',
    durationDays: 30,
    feeInSoles: 29.90,
    feeInCentimos: 2990,
    displayName: '30 días',
  },
]

/** Labels for payment status display */
export const PAYMENT_STATUS_LABELS: Record<PaymentDocStatus, string> = {
  pending: 'Pendiente',
  completed: 'Completado',
  failed: 'Fallido',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  expired: 'Expirado',
}

/** Boost tier display labels — every tier ever sold, for payment history. */
export const BOOST_TIER_LABELS: Record<BoostTier, string> = {
  sevenDays: '7 días',
  fifteenDays: '15 días',
  thirtyDays: '30 días',
}
