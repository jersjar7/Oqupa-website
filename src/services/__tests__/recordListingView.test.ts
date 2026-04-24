// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ───────────────────────────────────────────────────────────────────
// The service now routes through a Firebase callable Cloud Function so tests
// assert the callable is invoked with the correct payload rather than driving
// a client-side Firestore transaction.

const callableMock = vi.fn()
const httpsCallableMock = vi.fn((..._args: unknown[]) => callableMock)

vi.mock('firebase/functions', async () => {
  const actual = await vi.importActual<object>('firebase/functions')
  return {
    ...actual,
    httpsCallable: (...args: unknown[]) => httpsCallableMock(...args),
  }
})

vi.mock('@/lib/firebase', () => ({
  db: { __fake: true },
  functions: { __fakeFunctions: true },
}))

vi.mock('@/lib/clientId', () => ({
  getOrCreateClientId: () => 'fixed-client-id-1234567890abcdef',
}))

const { firestoreService } = await import('@/services/firestoreService')

// ── Tests ───────────────────────────────────────────────────────────────────

describe('firestoreService.recordListingView', () => {
  beforeEach(() => {
    callableMock.mockReset()
    callableMock.mockResolvedValue({ data: { incremented: true } })
    httpsCallableMock.mockClear()
  })

  it('invokes the recordListingView callable with listingId + clientId', async () => {
    await firestoreService.recordListingView('listing-1')

    expect(httpsCallableMock).toHaveBeenCalledWith(
      { __fakeFunctions: true },
      'recordListingView'
    )
    expect(callableMock).toHaveBeenCalledTimes(1)
    expect(callableMock).toHaveBeenCalledWith({
      listingId: 'listing-1',
      clientId: 'fixed-client-id-1234567890abcdef',
    })
  })

  it('resolves silently when the CF reports a same-day skip', async () => {
    callableMock.mockResolvedValueOnce({
      data: { incremented: false, reason: 'same-day' },
    })
    await expect(firestoreService.recordListingView('listing-1')).resolves.toBeUndefined()
  })

  it('propagates callable errors so the hook can silence them', async () => {
    callableMock.mockRejectedValueOnce(new Error('unauthenticated'))
    await expect(firestoreService.recordListingView('listing-1')).rejects.toThrow(
      'unauthenticated'
    )
  })
})
