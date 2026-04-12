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
}

export type PaymentDocStatus =
  | 'pending'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'expired'

/** Default tier configurations (fallback when Firestore config/pricing is unavailable) */
export const DEFAULT_BOOST_TIERS: BoostTierConfiguration[] = [
  {
    tier: 'sevenDays',
    durationDays: 7,
    feeInSoles: 9.90,
    feeInCentimos: 990,
    displayName: '7 días',
  },
  {
    tier: 'fifteenDays',
    durationDays: 15,
    feeInSoles: 19.90,
    feeInCentimos: 1990,
    displayName: '15 días',
  },
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

/** Boost tier display labels */
export const BOOST_TIER_LABELS: Record<BoostTier, string> = {
  sevenDays: '7 días',
  fifteenDays: '15 días',
  thirtyDays: '30 días',
}
