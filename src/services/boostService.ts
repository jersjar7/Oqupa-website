import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  type Timestamp,
} from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '@/lib/firebase'
import type {
  BoostTier,
  BoostTierConfiguration,
  BoostPaymentInitiation,
  Payment,
  PaymentDocStatus,
} from '@/types/boost'
import { DEFAULT_BOOST_TIERS as FALLBACK_TIERS } from '@/types/boost'

// Timestamp converter
function toDate(value: unknown): Date {
  if (!value) return new Date(0)
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as Timestamp).toDate()
  }
  if (typeof value === 'string') return new Date(value)
  return new Date(0)
}

function paymentFromDoc(id: string, data: Record<string, unknown>): Payment {
  return {
    id,
    amount: (data['amount'] as number) ?? 0,
    currency: (data['currency'] as string) ?? 'PEN',
    status: (data['status'] as PaymentDocStatus) ?? 'pending',
    provider: (data['provider'] as string) ?? 'stripe',
    method: (data['method'] as string) ?? 'card',
    description: (data['description'] as string) ?? '',
    paymentPurpose: (data['paymentPurpose'] as string) ?? '',
    listingId: (data['listingId'] as string) ?? '',
    boostTier: (data['boostTier'] as BoostTier) ?? 'sevenDays',
    userId: (data['userId'] as string) ?? '',
    stripePaymentIntentId: (data['stripePaymentIntentId'] as string) ?? '',
    createdAt: toDate(data['createdAt']),
    updatedAt: toDate(data['updatedAt']),
    completedAt: data['completedAt'] ? toDate(data['completedAt']) : undefined,
    expiresAt: data['expiresAt'] ? toDate(data['expiresAt']) : undefined,
  }
}

export const boostService = {
  /**
   * Fetches boost tier pricing from Firestore config/pricing document.
   * Falls back to hardcoded defaults if config is unavailable.
   */
  async getBoostTierConfigurations(): Promise<BoostTierConfiguration[]> {
    try {
      const configDoc = await getDoc(doc(db, 'config', 'pricing'))
      if (configDoc.exists()) {
        const data = configDoc.data() as Record<string, unknown>
        const boostTiers = data['boostTiers'] as Record<string, Record<string, unknown>> | undefined
        if (boostTiers) {
          const tiers: BoostTierConfiguration[] = []
          const tierKeys: BoostTier[] = ['sevenDays', 'fifteenDays', 'thirtyDays']
          for (const tierKey of tierKeys) {
            const tierData = boostTiers[tierKey]
            if (tierData) {
              const feeInCentimos = (tierData['feeInCentimos'] as number) ?? 0
              tiers.push({
                tier: tierKey,
                durationDays: (tierData['durationDays'] as number) ?? 0,
                feeInSoles: feeInCentimos / 100,
                feeInCentimos,
                displayName: (tierData['displayName'] as string) ?? tierKey,
              })
            }
          }
          if (tiers.length === 3) return tiers
        }
      }
    } catch (err) {
      console.warn('[boostService] Failed to read config/pricing, using defaults:', err)
    }
    return FALLBACK_TIERS
  },

  /**
   * Calls createBoostPaymentIntent Cloud Function.
   * Returns clientSecret and paymentId for Stripe Payment Element.
   */
  async createBoostPaymentIntent(
    listingId: string,
    boostTier: BoostTier,
  ): Promise<BoostPaymentInitiation> {
    const functions = getFunctions(undefined, 'southamerica-east1')
    const callable = httpsCallable<
      { listingId: string; boostTier: string },
      { clientSecret: string; paymentId: string }
    >(functions, 'createBoostPaymentIntent')

    const result = await callable({ listingId, boostTier })
    return {
      clientSecret: result.data.clientSecret,
      paymentId: result.data.paymentId,
    }
  },

  /**
   * Polls Firestore to check if a payment has been completed (webhook processed).
   * Returns true if status is 'completed'.
   */
  async isPaymentCompleted(paymentId: string): Promise<boolean> {
    try {
      const paymentDoc = await getDoc(doc(db, 'payments', paymentId))
      if (!paymentDoc.exists()) return false
      return (paymentDoc.data() as Record<string, unknown>)['status'] === 'completed'
    } catch {
      return false
    }
  },

  /**
   * Finds the most recent completed boost payment for a listing.
   * Used to determine refund eligibility.
   */
  async getLatestBoostPaymentId(listingId: string): Promise<string | null> {
    try {
      const q = query(
        collection(db, 'payments'),
        where('listingId', '==', listingId),
        where('status', '==', 'completed'),
        where('paymentPurpose', '==', 'listingBoost'),
        orderBy('completedAt', 'desc'),
        limit(1),
      )
      const snap = await getDocs(q)
      const firstDoc = snap.docs[0]
      if (!firstDoc) return null
      return firstDoc.id
    } catch {
      return null
    }
  },

  /**
   * Calls refundBoostPayment Cloud Function.
   * Validates 48-hour window server-side.
   */
  async requestRefund(paymentId: string): Promise<void> {
    const functions = getFunctions(undefined, 'southamerica-east1')
    const callable = httpsCallable<
      { paymentId: string },
      { success: boolean }
    >(functions, 'refundBoostPayment')
    await callable({ paymentId })
  },

  /**
   * Fetches all boost payments for a user (for payment history).
   * Ordered by createdAt desc.
   */
  async getUserBoostPayments(userId: string): Promise<Payment[]> {
    const q = query(
      collection(db, 'payments'),
      where('userId', '==', userId),
      where('paymentPurpose', '==', 'listingBoost'),
      orderBy('createdAt', 'desc'),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) =>
      paymentFromDoc(d.id, d.data() as Record<string, unknown>)
    )
  },

  /**
   * Fetches a single payment by ID.
   */
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    const paymentDoc = await getDoc(doc(db, 'payments', paymentId))
    if (!paymentDoc.exists()) return null
    return paymentFromDoc(paymentDoc.id, paymentDoc.data() as Record<string, unknown>)
  },
}
