// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  getDocMock, getDocsMock,
  queryMock, collectionMock, docMock, whereMock, orderByMock, limitMock,
  getFunctionsMock, httpsCallableMock, callableFnMock,
} = vi.hoisted(() => {
  const callableFnMock = vi.fn()
  return {
    getDocMock: vi.fn(),
    getDocsMock: vi.fn(),
    queryMock: vi.fn((...args: unknown[]) => ({ __query: args })),
    collectionMock: vi.fn(() => ({ __col: 'payments' })),
    docMock: vi.fn((_db: unknown, col: string, id: string) => ({ path: `${col}/${id}` })),
    whereMock: vi.fn(() => ({ __where: true })),
    orderByMock: vi.fn(() => ({ __orderBy: true })),
    limitMock: vi.fn(() => ({ __limit: true })),
    getFunctionsMock: vi.fn(() => ({ __functions: true })),
    httpsCallableMock: vi.fn(() => callableFnMock),
    callableFnMock,
  }
})

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => collectionMock(...args),
  doc: (...args: unknown[]) => docMock(...args),
  getDoc: (...args: unknown[]) => getDocMock(...args),
  getDocs: (...args: unknown[]) => getDocsMock(...args),
  query: (...args: unknown[]) => queryMock(...args),
  where: (...args: unknown[]) => whereMock(...args),
  orderBy: (...args: unknown[]) => orderByMock(...args),
  limit: (...args: unknown[]) => limitMock(...args),
}))

vi.mock('firebase/functions', () => ({
  getFunctions: (...args: unknown[]) => getFunctionsMock(...args),
  httpsCallable: (...args: unknown[]) => httpsCallableMock(...args),
}))

vi.mock('@/lib/firebase', () => ({ db: { __fakeDb: true } }))

import { boostService } from '../boostService'
import { DEFAULT_BOOST_TIERS } from '@/types/boost'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePaymentData(overrides: Record<string, unknown> = {}) {
  return {
    amount: 990,
    currency: 'PEN',
    status: 'completed',
    provider: 'stripe',
    method: 'card',
    description: 'Boost 7 días',
    paymentPurpose: 'listingBoost',
    listingId: 'listing-1',
    boostTier: 'sevenDays',
    userId: 'user-1',
    stripePaymentIntentId: 'pi_123',
    createdAt: { toDate: () => new Date('2026-09-01') },
    updatedAt: { toDate: () => new Date('2026-09-01') },
    completedAt: { toDate: () => new Date('2026-09-02') },
    ...overrides,
  }
}

function makeDocRef(id: string, data: Record<string, unknown>, exists = true) {
  return {
    id,
    exists: () => exists,
    data: () => data,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('boostService', () => {
  beforeEach(() => {
    getDocMock.mockReset()
    getDocsMock.mockReset()
    queryMock.mockReset().mockReturnValue({ __query: true })
    collectionMock.mockReset().mockReturnValue({ __col: true })
    whereMock.mockReset().mockReturnValue({ __where: true })
    orderByMock.mockReset().mockReturnValue({ __orderBy: true })
    limitMock.mockReset().mockReturnValue({ __limit: true })
    getFunctionsMock.mockReset().mockReturnValue({ __functions: true })
    httpsCallableMock.mockReset().mockReturnValue(callableFnMock)
    callableFnMock.mockReset()
  })

  // ── getBoostTierConfigurations ───────────────────────────────────────────

  describe('getBoostTierConfigurations', () => {
    it('returns parsed tiers from Firestore config when all 3 tiers present', async () => {
      getDocMock.mockResolvedValue(makeDocRef('pricing', {
        boostTiers: {
          sevenDays: { durationDays: 7, feeInCentimos: 990, displayName: '7 días' },
          fifteenDays: { durationDays: 15, feeInCentimos: 1990, displayName: '15 días' },
          thirtyDays: { durationDays: 30, feeInCentimos: 2990, displayName: '30 días' },
        },
      }))

      const tiers = await boostService.getBoostTierConfigurations()
      expect(tiers).toHaveLength(3)
      expect(tiers[0]).toMatchObject({
        tier: 'sevenDays',
        durationDays: 7,
        feeInCentimos: 990,
        feeInSoles: 9.9,
        displayName: '7 días',
      })
      expect(tiers[1]).toMatchObject({ tier: 'fifteenDays', feeInSoles: 19.9 })
      expect(tiers[2]).toMatchObject({ tier: 'thirtyDays', feeInSoles: 29.9 })
    })

    it('returns DEFAULT_BOOST_TIERS when doc does not exist', async () => {
      getDocMock.mockResolvedValue(makeDocRef('pricing', {}, false))
      const tiers = await boostService.getBoostTierConfigurations()
      expect(tiers).toEqual(DEFAULT_BOOST_TIERS)
    })

    it('returns DEFAULT_BOOST_TIERS when boostTiers field is missing', async () => {
      getDocMock.mockResolvedValue(makeDocRef('pricing', { otherField: true }))
      const tiers = await boostService.getBoostTierConfigurations()
      expect(tiers).toEqual(DEFAULT_BOOST_TIERS)
    })

    it('returns DEFAULT_BOOST_TIERS when fewer than 3 tiers exist in config', async () => {
      getDocMock.mockResolvedValue(makeDocRef('pricing', {
        boostTiers: {
          sevenDays: { durationDays: 7, feeInCentimos: 990, displayName: '7 días' },
          // fifteenDays and thirtyDays missing
        },
      }))
      const tiers = await boostService.getBoostTierConfigurations()
      expect(tiers).toEqual(DEFAULT_BOOST_TIERS)
    })

    it('returns DEFAULT_BOOST_TIERS when Firestore throws', async () => {
      getDocMock.mockRejectedValue(new Error('permission-denied'))
      const tiers = await boostService.getBoostTierConfigurations()
      expect(tiers).toEqual(DEFAULT_BOOST_TIERS)
    })

    it('converts feeInCentimos to feeInSoles by dividing by 100', async () => {
      getDocMock.mockResolvedValue(makeDocRef('pricing', {
        boostTiers: {
          sevenDays: { durationDays: 7, feeInCentimos: 500, displayName: 'test' },
          fifteenDays: { durationDays: 15, feeInCentimos: 1000, displayName: 'test' },
          thirtyDays: { durationDays: 30, feeInCentimos: 2000, displayName: 'test' },
        },
      }))
      const tiers = await boostService.getBoostTierConfigurations()
      expect(tiers[0]!.feeInSoles).toBe(5)
      expect(tiers[1]!.feeInSoles).toBe(10)
      expect(tiers[2]!.feeInSoles).toBe(20)
    })

    it('defaults feeInCentimos, durationDays, and displayName to 0/tierKey when absent (lines 71-77 ?? branches)', async () => {
      getDocMock.mockResolvedValue(makeDocRef('pricing', {
        boostTiers: {
          sevenDays: {},    // all numeric/string fields omitted
          fifteenDays: {},
          thirtyDays: {},
        },
      }))
      const tiers = await boostService.getBoostTierConfigurations()
      expect(tiers).toHaveLength(3)
      expect(tiers[0]!.feeInCentimos).toBe(0)    // ?? 0
      expect(tiers[0]!.durationDays).toBe(0)      // ?? 0
      expect(tiers[0]!.displayName).toBe('sevenDays')   // ?? tierKey
      expect(tiers[1]!.displayName).toBe('fifteenDays')
      expect(tiers[2]!.displayName).toBe('thirtyDays')
    })
  })

  // ── createBoostPaymentIntent ─────────────────────────────────────────────

  describe('createBoostPaymentIntent', () => {
    it('returns clientSecret and paymentId from the callable', async () => {
      callableFnMock.mockResolvedValue({
        data: { clientSecret: 'pi_secret_123', paymentId: 'pay-abc' },
      })
      const result = await boostService.createBoostPaymentIntent('listing-1', 'sevenDays')
      expect(result).toEqual({ clientSecret: 'pi_secret_123', paymentId: 'pay-abc' })
    })

    it('calls callable with listingId and boostTier', async () => {
      callableFnMock.mockResolvedValue({ data: { clientSecret: 's', paymentId: 'p' } })
      await boostService.createBoostPaymentIntent('listing-xyz', 'thirtyDays')
      expect(callableFnMock).toHaveBeenCalledWith({ listingId: 'listing-xyz', boostTier: 'thirtyDays' })
    })

    it('calls getFunctions with southamerica-east1 region', async () => {
      callableFnMock.mockResolvedValue({ data: { clientSecret: 's', paymentId: 'p' } })
      await boostService.createBoostPaymentIntent('listing-1', 'sevenDays')
      expect(getFunctionsMock).toHaveBeenCalledWith(undefined, 'southamerica-east1')
    })

    it('calls httpsCallable with createBoostPaymentIntent', async () => {
      callableFnMock.mockResolvedValue({ data: { clientSecret: 's', paymentId: 'p' } })
      await boostService.createBoostPaymentIntent('listing-1', 'sevenDays')
      expect(httpsCallableMock).toHaveBeenCalledWith(expect.anything(), 'createBoostPaymentIntent')
    })

    it('propagates errors from the callable', async () => {
      callableFnMock.mockRejectedValue(new Error('functions/internal'))
      await expect(boostService.createBoostPaymentIntent('listing-1', 'sevenDays')).rejects.toThrow()
    })
  })

  // ── isPaymentCompleted ───────────────────────────────────────────────────

  describe('isPaymentCompleted', () => {
    it('returns true when payment status is "completed"', async () => {
      getDocMock.mockResolvedValue(makeDocRef('pay-1', { status: 'completed' }))
      const result = await boostService.isPaymentCompleted('pay-1')
      expect(result).toBe(true)
    })

    it('returns false when payment status is "pending"', async () => {
      getDocMock.mockResolvedValue(makeDocRef('pay-1', { status: 'pending' }))
      const result = await boostService.isPaymentCompleted('pay-1')
      expect(result).toBe(false)
    })

    it('returns false when doc does not exist', async () => {
      getDocMock.mockResolvedValue(makeDocRef('pay-1', {}, false))
      const result = await boostService.isPaymentCompleted('pay-1')
      expect(result).toBe(false)
    })

    it('returns false when Firestore throws', async () => {
      getDocMock.mockRejectedValue(new Error('permission-denied'))
      const result = await boostService.isPaymentCompleted('pay-1')
      expect(result).toBe(false)
    })
  })

  // ── getLatestBoostPaymentId ──────────────────────────────────────────────

  describe('getLatestBoostPaymentId', () => {
    it('returns the first doc id when results exist', async () => {
      getDocsMock.mockResolvedValue({ docs: [{ id: 'pay-abc', data: () => ({}) }] })
      const result = await boostService.getLatestBoostPaymentId('listing-1')
      expect(result).toBe('pay-abc')
    })

    it('returns null when no docs returned', async () => {
      getDocsMock.mockResolvedValue({ docs: [] })
      const result = await boostService.getLatestBoostPaymentId('listing-1')
      expect(result).toBeNull()
    })

    it('returns null when Firestore throws', async () => {
      getDocsMock.mockRejectedValue(new Error('index-not-ready'))
      const result = await boostService.getLatestBoostPaymentId('listing-1')
      expect(result).toBeNull()
    })

    it('queries with correct filters', async () => {
      getDocsMock.mockResolvedValue({ docs: [] })
      await boostService.getLatestBoostPaymentId('listing-xyz')
      expect(whereMock).toHaveBeenCalledWith('listingId', '==', 'listing-xyz')
      expect(whereMock).toHaveBeenCalledWith('status', '==', 'completed')
      expect(whereMock).toHaveBeenCalledWith('paymentPurpose', '==', 'listingBoost')
      expect(orderByMock).toHaveBeenCalledWith('completedAt', 'desc')
      expect(limitMock).toHaveBeenCalledWith(1)
    })
  })

  // ── requestRefund ────────────────────────────────────────────────────────

  describe('requestRefund', () => {
    it('calls the refundBoostPayment callable with paymentId', async () => {
      callableFnMock.mockResolvedValue({ data: { success: true } })
      await boostService.requestRefund('pay-123')
      expect(callableFnMock).toHaveBeenCalledWith({ paymentId: 'pay-123' })
    })

    it('calls httpsCallable with "refundBoostPayment"', async () => {
      callableFnMock.mockResolvedValue({ data: { success: true } })
      await boostService.requestRefund('pay-123')
      expect(httpsCallableMock).toHaveBeenCalledWith(expect.anything(), 'refundBoostPayment')
    })

    it('calls getFunctions with southamerica-east1 region', async () => {
      callableFnMock.mockResolvedValue({ data: { success: true } })
      await boostService.requestRefund('pay-123')
      expect(getFunctionsMock).toHaveBeenCalledWith(undefined, 'southamerica-east1')
    })
  })

  // ── getUserBoostPayments ─────────────────────────────────────────────────

  describe('getUserBoostPayments', () => {
    it('returns an empty array when no payments exist', async () => {
      getDocsMock.mockResolvedValue({ docs: [] })
      const result = await boostService.getUserBoostPayments('user-1')
      expect(result).toEqual([])
    })

    it('maps payment docs to Payment objects', async () => {
      const data = makePaymentData()
      getDocsMock.mockResolvedValue({
        docs: [{ id: 'pay-1', data: () => data }],
      })
      const result = await boostService.getUserBoostPayments('user-1')
      expect(result).toHaveLength(1)
      expect(result[0]!.id).toBe('pay-1')
      expect(result[0]!.amount).toBe(990)
      expect(result[0]!.boostTier).toBe('sevenDays')
      expect(result[0]!.status).toBe('completed')
      expect(result[0]!.createdAt).toBeInstanceOf(Date)
    })

    it('queries with userId and paymentPurpose filters ordered by createdAt desc', async () => {
      getDocsMock.mockResolvedValue({ docs: [] })
      await boostService.getUserBoostPayments('user-xyz')
      expect(whereMock).toHaveBeenCalledWith('userId', '==', 'user-xyz')
      expect(whereMock).toHaveBeenCalledWith('paymentPurpose', '==', 'listingBoost')
      expect(orderByMock).toHaveBeenCalledWith('createdAt', 'desc')
    })

    it('includes completedAt as Date when present in data', async () => {
      const completedDate = new Date('2026-09-02T10:00:00Z')
      const data = makePaymentData({ completedAt: { toDate: () => completedDate } })
      getDocsMock.mockResolvedValue({ docs: [{ id: 'pay-1', data: () => data }] })
      const result = await boostService.getUserBoostPayments('user-1')
      expect(result[0]!.completedAt).toEqual(completedDate)
    })

    it('sets completedAt to undefined when not present in data', async () => {
      const data = makePaymentData({ completedAt: null })
      getDocsMock.mockResolvedValue({ docs: [{ id: 'pay-1', data: () => data }] })
      const result = await boostService.getUserBoostPayments('user-1')
      expect(result[0]!.completedAt).toBeUndefined()
    })

    it('applies string fallbacks for missing string fields', async () => {
      const minimalData = {
        createdAt: null,
        updatedAt: null,
      }
      getDocsMock.mockResolvedValue({ docs: [{ id: 'pay-1', data: () => minimalData }] })
      const result = await boostService.getUserBoostPayments('user-1')
      expect(result[0]!.currency).toBe('PEN')
      expect(result[0]!.provider).toBe('stripe')
      expect(result[0]!.method).toBe('card')
      expect(result[0]!.description).toBe('')
      expect(result[0]!.boostTier).toBe('sevenDays')
      expect(result[0]!.amount).toBe(0)
    })
  })

  // ── getPaymentById ───────────────────────────────────────────────────────

  describe('getPaymentById', () => {
    it('returns a Payment object when doc exists', async () => {
      const data = makePaymentData()
      getDocMock.mockResolvedValue(makeDocRef('pay-abc', data))
      const result = await boostService.getPaymentById('pay-abc')
      expect(result).not.toBeNull()
      expect(result!.id).toBe('pay-abc')
      expect(result!.listingId).toBe('listing-1')
    })

    it('returns null when doc does not exist', async () => {
      getDocMock.mockResolvedValue(makeDocRef('pay-abc', {}, false))
      const result = await boostService.getPaymentById('pay-abc')
      expect(result).toBeNull()
    })

    it('converts Timestamp fields to Date', async () => {
      const expectedDate = new Date('2026-09-01T08:00:00Z')
      const data = makePaymentData({ createdAt: { toDate: () => expectedDate } })
      getDocMock.mockResolvedValue(makeDocRef('pay-abc', data))
      const result = await boostService.getPaymentById('pay-abc')
      expect(result!.createdAt).toEqual(expectedDate)
    })

    it('falls back to epoch Date (new Date(0)) when createdAt is null/missing', async () => {
      const data = makePaymentData({ createdAt: null, updatedAt: null })
      getDocMock.mockResolvedValue(makeDocRef('pay-abc', data))
      const result = await boostService.getPaymentById('pay-abc')
      expect(result!.createdAt.getTime()).toBe(new Date(0).getTime())
    })

    it('includes expiresAt when present', async () => {
      const expiryDate = new Date('2026-10-01')
      const data = makePaymentData({ expiresAt: { toDate: () => expiryDate } })
      getDocMock.mockResolvedValue(makeDocRef('pay-abc', data))
      const result = await boostService.getPaymentById('pay-abc')
      expect(result!.expiresAt).toEqual(expiryDate)
    })

    it('sets expiresAt to undefined when not present', async () => {
      const data = makePaymentData({ expiresAt: null })
      getDocMock.mockResolvedValue(makeDocRef('pay-abc', data))
      const result = await boostService.getPaymentById('pay-abc')
      expect(result!.expiresAt).toBeUndefined()
    })

    it('converts a string timestamp createdAt to Date (line 29 of boostService.ts)', async () => {
      // Exercises `if (typeof value === 'string') return new Date(value)`
      const data = makePaymentData({ createdAt: '2026-09-10T08:00:00Z' })
      getDocMock.mockResolvedValue(makeDocRef('pay-abc', data))
      const result = await boostService.getPaymentById('pay-abc')
      expect(result!.createdAt).toBeInstanceOf(Date)
      expect(result!.createdAt.getFullYear()).toBe(2026)
    })

    it('falls back to new Date(0) when createdAt is an unexpected type (line 30 of boostService.ts)', async () => {
      // Exercises the final `return new Date(0)` for a non-null, non-object, non-string value
      const data = makePaymentData({ createdAt: 12345 })
      getDocMock.mockResolvedValue(makeDocRef('pay-abc', data))
      const result = await boostService.getPaymentById('pay-abc')
      expect(result!.createdAt.getTime()).toBe(new Date(0).getTime())
    })
  })
})
