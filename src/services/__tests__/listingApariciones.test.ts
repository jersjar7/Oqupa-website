// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ADR-051: lifetime Apariciones live in listingTotals/{listingId}, readable by
// the owner only. The owner's totals are read in ONE query by owner — a
// listing nobody has seen yet has no record, and reading a missing record one
// by one is refused by the rules (staging, 2026-11-05: Mi panel showed "—"
// for an owner with five unseen listings). Missing = 0.

const getDocsMock = vi.fn()
const whereMock = vi.fn((...a: unknown[]) => ({ where: a }))
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<object>('firebase/firestore')
  return {
    ...actual,
    collection: (_db: unknown, name: string) => ({ collection: name }),
    where: (...a: unknown[]) => whereMock(...a),
    query: (...a: unknown[]) => ({ query: a }),
    getDocs: (q: unknown) => getDocsMock(q),
  }
})
vi.mock('@/lib/firebase', () => ({ db: { __fake: true }, functions: {} }))

const { firestoreService } = await import('@/services/firestoreService')

const snap = (docs: Array<{ id: string; shown?: unknown }>) => ({
  docs: docs.map((d) => ({ id: d.id, data: () => ({ shown: d.shown }) })),
})

describe('firestoreService.getOwnerApariciones', () => {
  beforeEach(() => {
    getDocsMock.mockReset()
    whereMock.mockClear()
  })

  it('reads the owner\'s totals in one query, by owner', async () => {
    getDocsMock.mockResolvedValue(snap([{ id: 'L1', shown: 210 }, { id: 'L2', shown: 3 }]))
    await expect(firestoreService.getOwnerApariciones('owner-1')).resolves.toEqual({ L1: 210, L2: 3 })
    expect(getDocsMock).toHaveBeenCalledTimes(1)
    expect(whereMock).toHaveBeenCalledWith('ownerId', '==', 'owner-1')
  })

  it('a record without a number counts as 0', async () => {
    getDocsMock.mockResolvedValue(snap([{ id: 'L1', shown: undefined }]))
    await expect(firestoreService.getOwnerApariciones('owner-1')).resolves.toEqual({ L1: 0 })
  })

  it('a failed read is an error, never a 0', async () => {
    getDocsMock.mockImplementationOnce(async () => { throw new Error('permission-denied') })
    await expect(firestoreService.getOwnerApariciones('owner-1')).rejects.toThrow()
  })
})
