import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Firestore mocks ─────────────────────────────────────────────────────────
// We capture the transaction callback and invoke it with a fake transaction
// so we can assert reads/writes in the correct order.

type TxnCallback = (tx: MockTransaction) => Promise<void>

interface MockTransaction {
  get: (ref: unknown) => Promise<{ exists: () => boolean; data: () => unknown }>
  set: (ref: unknown, data: unknown) => void
  update: (ref: unknown, data: unknown) => void
}

const runTransactionMock = vi.fn()

// Firestore Timestamp stand-in — lets us ensure we write Timestamp.now()
// and read a Timestamp-ish object with a working `toDate()`.
class FakeTimestamp {
  private date: Date
  constructor(date: Date) { this.date = date }
  toDate() { return this.date }
  static now() { return new FakeTimestamp(new Date()) }
  static fromDate(d: Date) { return new FakeTimestamp(d) }
}

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<object>('firebase/firestore')
  return {
    ...actual,
    // Skip the db arg (first) and join the rest with '/'
    doc: vi.fn((...args: unknown[]) => ({ path: args.slice(1).join('/') })),
    runTransaction: (_db: unknown, cb: TxnCallback) => runTransactionMock(cb),
    Timestamp: FakeTimestamp,
  }
})

vi.mock('@/lib/firebase', () => ({
  db: { __fake: true },
}))

const { firestoreService } = await import('@/services/firestoreService')

// ── Test helpers ────────────────────────────────────────────────────────────

type Reads = Map<string, { exists: boolean; data?: unknown }>

function makeFakeTxn(reads: Reads) {
  const writes: { op: 'set' | 'update'; ref: { path: string }; data: unknown }[] = []
  const txn: MockTransaction = {
    get: vi.fn(async (ref: unknown) => {
      const path = (ref as { path: string }).path
      const preset = reads.get(path) ?? { exists: false }
      return {
        exists: () => preset.exists,
        data: () => preset.data,
      }
    }),
    set: vi.fn((ref: unknown, data: unknown) => {
      writes.push({ op: 'set', ref: ref as { path: string }, data })
    }),
    update: vi.fn((ref: unknown, data: unknown) => {
      writes.push({ op: 'update', ref: ref as { path: string }, data })
    }),
  }
  return { txn, writes }
}

function wireTransaction(reads: Reads) {
  const fixture = makeFakeTxn(reads)
  runTransactionMock.mockImplementationOnce(async (cb: TxnCallback) => {
    await cb(fixture.txn)
  })
  return fixture
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('firestoreService.recordListingView', () => {
  beforeEach(() => {
    runTransactionMock.mockReset()
  })

  it('writes the viewedListings doc AND increments viewCount on first view', async () => {
    const reads: Reads = new Map()
    reads.set('users/viewer-1/viewedListings/listing-1', { exists: false })
    reads.set('listings/listing-1', { exists: true, data: { viewCount: 42 } })

    const { writes } = wireTransaction(reads)

    await firestoreService.recordListingView('listing-1', 'viewer-1')

    expect(writes).toHaveLength(2)
    const viewedWrite = writes[0]!
    const countWrite = writes[1]!
    expect(viewedWrite.op).toBe('set')
    expect(viewedWrite.ref.path).toBe('users/viewer-1/viewedListings/listing-1')
    expect((viewedWrite.data as { listingId: string }).listingId).toBe('listing-1')
    expect((viewedWrite.data as { viewedAt: unknown }).viewedAt).toBeInstanceOf(FakeTimestamp)
    expect(countWrite.op).toBe('update')
    expect(countWrite.ref.path).toBe('listings/listing-1')
    expect(countWrite.data).toEqual({ viewCount: 43 })
  })

  it('skips increment if already viewed today (same calendar day)', async () => {
    const today = new Date()
    const reads: Reads = new Map()
    reads.set('users/viewer-1/viewedListings/listing-1', {
      exists: true,
      data: { viewedAt: FakeTimestamp.fromDate(today), listingId: 'listing-1' },
    })
    reads.set('listings/listing-1', { exists: true, data: { viewCount: 10 } })

    const { writes } = wireTransaction(reads)
    await firestoreService.recordListingView('listing-1', 'viewer-1')
    expect(writes).toHaveLength(0)
  })

  it('re-increments when the prior view was yesterday', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    const reads: Reads = new Map()
    reads.set('users/viewer-1/viewedListings/listing-1', {
      exists: true,
      data: { viewedAt: FakeTimestamp.fromDate(yesterday), listingId: 'listing-1' },
    })
    reads.set('listings/listing-1', { exists: true, data: { viewCount: 7 } })

    const { writes } = wireTransaction(reads)
    await firestoreService.recordListingView('listing-1', 'viewer-1')

    expect(writes).toHaveLength(2)
    expect(writes[1]!.data).toEqual({ viewCount: 8 })
  })

  it('throws if the listing does not exist', async () => {
    const reads: Reads = new Map()
    reads.set('users/viewer-1/viewedListings/listing-missing', { exists: false })
    reads.set('listings/listing-missing', { exists: false })

    wireTransaction(reads)

    await expect(
      firestoreService.recordListingView('listing-missing', 'viewer-1')
    ).rejects.toThrow('Listing not found')
  })

  it('defaults missing viewCount to 0 and increments to 1', async () => {
    const reads: Reads = new Map()
    reads.set('users/viewer-1/viewedListings/listing-1', { exists: false })
    reads.set('listings/listing-1', { exists: true, data: {} })

    const { writes } = wireTransaction(reads)
    await firestoreService.recordListingView('listing-1', 'viewer-1')

    expect(writes[1]!.data).toEqual({ viewCount: 1 })
  })

  it('handles malformed viewedAt field gracefully (still increments)', async () => {
    const reads: Reads = new Map()
    reads.set('users/viewer-1/viewedListings/listing-1', {
      exists: true,
      data: { viewedAt: 'not-a-timestamp' },
    })
    reads.set('listings/listing-1', { exists: true, data: { viewCount: 5 } })

    const { writes } = wireTransaction(reads)
    await firestoreService.recordListingView('listing-1', 'viewer-1')

    // Malformed timestamp → falls through to incrementing (safer than skipping).
    expect(writes).toHaveLength(2)
    expect(writes[1]!.data).toEqual({ viewCount: 6 })
  })
})
