// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ADR-051: lifetime Apariciones live in listingTotals/{listingId}, readable by
// the owner only. A listing nobody has seen yet has no record: that is 0.

const getDocMock = vi.fn()
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<object>('firebase/firestore')
  return { ...actual, doc: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }), getDoc: (ref: unknown) => getDocMock(ref) }
})
vi.mock('@/lib/firebase', () => ({ db: { __fake: true }, functions: {} }))

const { firestoreService } = await import('@/services/firestoreService')

describe('firestoreService.getListingApariciones', () => {
  beforeEach(() => getDocMock.mockReset())

  it('reads the owner-only total for the listing', async () => {
    getDocMock.mockResolvedValue({ exists: () => true, data: () => ({ shown: 210 }) })
    await expect(firestoreService.getListingApariciones('L1')).resolves.toBe(210)
    expect(getDocMock).toHaveBeenCalledWith({ path: 'listingTotals/L1' })
  })

  it('no record yet means 0', async () => {
    getDocMock.mockResolvedValue({ exists: () => false, data: () => undefined })
    await expect(firestoreService.getListingApariciones('L1')).resolves.toBe(0)
  })

  it('a failed read is an error, never a 0', async () => {
    getDocMock.mockImplementationOnce(async () => { throw new Error('permission-denied') })
    await expect(firestoreService.getListingApariciones('L1')).rejects.toThrow()
  })
})
