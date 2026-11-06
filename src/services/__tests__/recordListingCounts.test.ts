// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ADR-051: the website sends its Apariciones and Vistas to the one server
// counter both apps use, with its existing anonymous browser id and
// platform 'web'.

const callableMock = vi.fn()
const httpsCallableMock = vi.fn((..._args: unknown[]) => callableMock)

vi.mock('firebase/functions', async () => {
  const actual = await vi.importActual<object>('firebase/functions')
  return { ...actual, httpsCallable: (...args: unknown[]) => httpsCallableMock(...args) }
})
vi.mock('@/lib/firebase', () => ({ db: { __fake: true }, functions: { __fakeFunctions: true } }))
vi.mock('@/lib/clientId', () => ({ getOrCreateClientId: () => 'fixed-client-id-1234567890abcdef' }))

const { firestoreService } = await import('@/services/firestoreService')

describe('firestoreService.recordListingCounts', () => {
  beforeEach(() => {
    callableMock.mockReset()
    callableMock.mockResolvedValue({ data: { counted: { shown: 1, seen: 0 } } })
    httpsCallableMock.mockClear()
  })

  it('calls recordListingCounts with the browser id, platform web and the events', async () => {
    await firestoreService.recordListingCounts([
      { listingId: 'L1', kind: 'shown' },
      { listingId: 'L2', kind: 'seen' },
    ])
    expect(httpsCallableMock).toHaveBeenCalledWith({ __fakeFunctions: true }, 'recordListingCounts')
    expect(callableMock).toHaveBeenCalledWith({
      deviceId: 'fixed-client-id-1234567890abcdef',
      platform: 'web',
      events: [
        { listingId: 'L1', kind: 'shown' },
        { listingId: 'L2', kind: 'seen' },
      ],
    })
  })

  it('sends nothing for an empty list', async () => {
    await firestoreService.recordListingCounts([])
    expect(callableMock).not.toHaveBeenCalled()
  })

  it('passes errors up so the queue can retry once', async () => {
    callableMock.mockRejectedValueOnce(new Error('internal'))
    await expect(firestoreService.recordListingCounts([{ listingId: 'L1', kind: 'shown' }])).rejects.toThrow('internal')
  })
})
