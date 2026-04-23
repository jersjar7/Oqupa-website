// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// ── Mocks ───────────────────────────────────────────────────────────────────

const recordListingViewMock = vi.fn()
vi.mock('@/services/firestoreService', () => ({
  firestoreService: {
    recordListingView: (...args: unknown[]) => recordListingViewMock(...args),
  },
}))

// Mutable auth state — tests tweak this between renders.
type FakeAuthState = {
  firebaseUser: { uid: string } | null
  user: { id: string } | null
}
let fakeAuth: FakeAuthState = { firebaseUser: null, user: null }

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: FakeAuthState) => unknown) => selector(fakeAuth),
}))

const { useRecordListingView } = await import('../useRecordListingView')

// ── Tests ───────────────────────────────────────────────────────────────────

describe('useRecordListingView', () => {
  beforeEach(() => {
    recordListingViewMock.mockReset()
    recordListingViewMock.mockResolvedValue(undefined)
    fakeAuth = { firebaseUser: null, user: null }
  })

  it('does not fire when unauthenticated', () => {
    fakeAuth = { firebaseUser: null, user: null }
    renderHook(() => useRecordListingView('listing-1', 'owner-1'))
    expect(recordListingViewMock).not.toHaveBeenCalled()
  })

  it('does not fire when listingId is missing', () => {
    fakeAuth = { firebaseUser: { uid: 'u1' }, user: { id: 'u1' } }
    renderHook(() => useRecordListingView(undefined, 'owner-1'))
    expect(recordListingViewMock).not.toHaveBeenCalled()
  })

  it('does not fire when ownerId is missing (listing not loaded yet)', () => {
    fakeAuth = { firebaseUser: { uid: 'u1' }, user: { id: 'u1' } }
    renderHook(() => useRecordListingView('listing-1', undefined))
    expect(recordListingViewMock).not.toHaveBeenCalled()
  })

  it('does not fire when the viewer is the owner (self-view)', () => {
    fakeAuth = { firebaseUser: { uid: 'owner-1' }, user: { id: 'owner-1' } }
    renderHook(() => useRecordListingView('listing-1', 'owner-1'))
    expect(recordListingViewMock).not.toHaveBeenCalled()
  })

  it('fires exactly once for authenticated non-owner viewer', () => {
    fakeAuth = { firebaseUser: { uid: 'viewer-1' }, user: { id: 'viewer-1' } }
    renderHook(() => useRecordListingView('listing-1', 'owner-1'))
    expect(recordListingViewMock).toHaveBeenCalledTimes(1)
    expect(recordListingViewMock).toHaveBeenCalledWith('listing-1', 'viewer-1')
  })

  it('does not re-fire on re-render with the same listing/user', () => {
    fakeAuth = { firebaseUser: { uid: 'viewer-1' }, user: { id: 'viewer-1' } }
    const { rerender } = renderHook(
      (props: { id: string; owner: string }) => useRecordListingView(props.id, props.owner),
      { initialProps: { id: 'listing-1', owner: 'owner-1' } },
    )
    rerender({ id: 'listing-1', owner: 'owner-1' })
    rerender({ id: 'listing-1', owner: 'owner-1' })
    expect(recordListingViewMock).toHaveBeenCalledTimes(1)
  })

  it('fires again for a different listing (same viewer)', () => {
    fakeAuth = { firebaseUser: { uid: 'viewer-1' }, user: { id: 'viewer-1' } }
    const { rerender } = renderHook(
      (props: { id: string; owner: string }) => useRecordListingView(props.id, props.owner),
      { initialProps: { id: 'listing-1', owner: 'owner-1' } },
    )
    rerender({ id: 'listing-2', owner: 'owner-2' })
    expect(recordListingViewMock).toHaveBeenCalledTimes(2)
    expect(recordListingViewMock).toHaveBeenNthCalledWith(1, 'listing-1', 'viewer-1')
    expect(recordListingViewMock).toHaveBeenNthCalledWith(2, 'listing-2', 'viewer-1')
  })

  it('swallows service errors (silent failure)', async () => {
    recordListingViewMock.mockRejectedValueOnce(new Error('permission-denied'))
    fakeAuth = { firebaseUser: { uid: 'viewer-1' }, user: { id: 'viewer-1' } }
    // Should NOT throw.
    renderHook(() => useRecordListingView('listing-1', 'owner-1'))
    await new Promise((r) => setTimeout(r, 0))
    // Test passes if we reach this point without an unhandled rejection.
    expect(recordListingViewMock).toHaveBeenCalled()
  })
})
