// @vitest-environment jsdom
// Metrics plan A12c: the Analytics labels are applied where a session starts —
// whenever the site has a signed-in person — not inside the sign-up pages
// (the founder is changing those in A12b). Once per person per session.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

type Options = { isStillSignedIn?: () => boolean }
const { applyMock } = vi.hoisted(() => ({ applyMock: vi.fn(async (_uid: string, _options?: Options) => {}) }))
const mockAuthState = { firebaseUser: null as { uid: string } | null }

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (select: (s: typeof mockAuthState) => unknown) => select(mockAuthState),
}))
vi.mock('@/services/analyticsLabelsService', () => ({
  applyAnalyticsLabels: (uid: string, options?: Options) => applyMock(uid, options),
}))

import AnalyticsLabelsInitializer from '../AnalyticsLabelsInitializer'

describe('AnalyticsLabelsInitializer', () => {
  beforeEach(() => {
    applyMock.mockClear()
    mockAuthState.firebaseUser = null
  })

  it('applies the labels for a signed-in person', () => {
    mockAuthState.firebaseUser = { uid: 'u1' }
    render(<AnalyticsLabelsInitializer />)
    expect(applyMock.mock.calls.map(([uid]) => uid)).toEqual(['u1'])
  })

  it('only once while the same person stays signed in, however often the user refreshes', () => {
    mockAuthState.firebaseUser = { uid: 'u1' }
    const { rerender } = render(<AnalyticsLabelsInitializer />)
    mockAuthState.firebaseUser = { uid: 'u1' } // a refreshed token is a new object
    rerender(<AnalyticsLabelsInitializer />)
    expect(applyMock).toHaveBeenCalledTimes(1)
  })

  it('applies the new person\'s labels when someone else signs in, and again after signing back in', () => {
    mockAuthState.firebaseUser = { uid: 'u1' }
    const { rerender } = render(<AnalyticsLabelsInitializer />)
    mockAuthState.firebaseUser = null
    rerender(<AnalyticsLabelsInitializer />)
    mockAuthState.firebaseUser = { uid: 'u2' }
    rerender(<AnalyticsLabelsInitializer />)
    mockAuthState.firebaseUser = null
    rerender(<AnalyticsLabelsInitializer />)
    mockAuthState.firebaseUser = { uid: 'u2' }
    rerender(<AnalyticsLabelsInitializer />)
    expect(applyMock.mock.calls.map(([uid]) => uid)).toEqual(['u1', 'u2', 'u2'])
  })

  it('does nothing for a guest', () => {
    render(<AnalyticsLabelsInitializer />)
    expect(applyMock).not.toHaveBeenCalled()
  })

  it('tells a read for the last person that they have gone', () => {
    mockAuthState.firebaseUser = { uid: 'u1' }
    const { rerender } = render(<AnalyticsLabelsInitializer />)
    const firstRead = applyMock.mock.calls[0]![1]!
    expect(firstRead.isStillSignedIn!()).toBe(true)
    mockAuthState.firebaseUser = { uid: 'u2' }
    rerender(<AnalyticsLabelsInitializer />)
    expect(firstRead.isStillSignedIn!()).toBe(false)
  })
})
