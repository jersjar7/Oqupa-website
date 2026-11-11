// @vitest-environment jsdom
// ADR-058 — the hook never invites an owner to publish unless the server said
// they have no listings (break-it web #2), and refreshes only a stale page (#5).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

const fb = vi.hoisted(() => ({
  snapshot: null as null | ((s: { exists: () => boolean; data: () => unknown }) => void),
  callable: vi.fn(),
}))
vi.mock('@/lib/firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  onSnapshot: (_ref: unknown, next: (s: unknown) => void) => { fb.snapshot = next as never; return () => undefined },
}))
vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => fb.callable,
}))

import { useOwnerAnalytics } from '../useOwnerAnalytics'

const missing = { exists: () => false, data: () => undefined }
const page = (builtAt: Date) => ({ exists: () => true, data: () => ({ today: '2026-11-20', builtAt, listings: [], periods: {} }) })

describe('useOwnerAnalytics (ADR-058)', () => {
  beforeEach(() => { fb.callable.mockReset(); fb.snapshot = null })
  afterEach(() => vi.useRealTimers())

  it('no page and the server says "no-listings": the invitation to publish', async () => {
    fb.callable.mockResolvedValue({ data: { rebuilt: false, reason: 'no-listings' } })
    const { result } = renderHook(() => useOwnerAnalytics('u1'))
    act(() => fb.snapshot!(missing))
    await waitFor(() => expect(result.current.status).toBe('none'))
  })

  it('no page and the server is busy or fails: an error, never the invitation', async () => {
    fb.callable.mockResolvedValue({ data: { rebuilt: false, reason: 'busy' } })
    const a = renderHook(() => useOwnerAnalytics('u1'))
    act(() => fb.snapshot!(missing))
    await waitFor(() => expect(a.result.current.status).toBe('error'))

    fb.callable.mockRejectedValue(new Error('internal'))
    const b = renderHook(() => useOwnerAnalytics('u2'))
    act(() => fb.snapshot!(missing))
    await waitFor(() => expect(b.result.current.status).toBe('error'))
  })

  it('rebuilt: waits for the page instead of declaring "none" before it arrives', async () => {
    fb.callable.mockResolvedValue({ data: { rebuilt: true } })
    const { result } = renderHook(() => useOwnerAnalytics('u1'))
    act(() => fb.snapshot!(missing))
    await waitFor(() => expect(fb.callable).toHaveBeenCalledTimes(1))
    expect(result.current.status).toBe('loading')
    act(() => fb.snapshot!(page(new Date())))
    expect(result.current.status).toBe('ready')
  })

  it('a fresh page asks nothing; one older than 30 hours asks once (break-it web #5)', async () => {
    fb.callable.mockResolvedValue({ data: { rebuilt: true } })
    renderHook(() => useOwnerAnalytics('u1'))
    act(() => fb.snapshot!(page(new Date(Date.now() - 3 * 3600e3))))
    expect(fb.callable).not.toHaveBeenCalled()
    act(() => fb.snapshot!(page(new Date(Date.now() - 31 * 3600e3))))
    act(() => fb.snapshot!(page(new Date(Date.now() - 31 * 3600e3))))
    expect(fb.callable).toHaveBeenCalledTimes(1)
  })
})
