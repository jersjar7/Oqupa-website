// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useIsDesktop } from '@/hooks/useMediaQuery'

// ── matchMedia stub factory ───────────────────────────────────────────────────
//
// jsdom does not implement window.matchMedia. We provide a minimal stub that
// lets tests control the `matches` value and fire `change` events manually.

type ChangeHandler = (e: MediaQueryListEvent) => void

interface MqlStub {
  matches: boolean
  query: string
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  /** Fire a change event with the given matches value. */
  fireChange(newMatches: boolean): void
}

function makeMqlStub(query: string, initialMatches: boolean): MqlStub {
  const handlers: ChangeHandler[] = []

  const stub: MqlStub = {
    matches: initialMatches,
    query,
    addEventListener: vi.fn((_event: string, handler: ChangeHandler) => {
      handlers.push(handler)
    }),
    removeEventListener: vi.fn((_event: string, handler: ChangeHandler) => {
      const idx = handlers.indexOf(handler)
      if (idx !== -1) handlers.splice(idx, 1)
    }),
    fireChange(newMatches: boolean) {
      stub.matches = newMatches
      const event = { matches: newMatches, media: query } as MediaQueryListEvent
      handlers.forEach(h => h(event))
    },
  }

  return stub
}

// ── Tests: useIsDesktop (wraps useMediaQuery with the md breakpoint query) ────

describe('useIsDesktop', () => {
  let mqlStub: MqlStub

  beforeEach(() => {
    mqlStub = makeMqlStub('(min-width: 768px)', true)
    vi.stubGlobal('matchMedia', vi.fn(() => mqlStub))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ── initial state ───────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('returns true when matchMedia.matches is true on mount', () => {
      mqlStub = makeMqlStub('(min-width: 768px)', true)
      vi.stubGlobal('matchMedia', vi.fn(() => mqlStub))

      const { result } = renderHook(() => useIsDesktop())

      expect(result.current).toBe(true)
    })

    it('returns false when matchMedia.matches is false on mount', () => {
      mqlStub = makeMqlStub('(min-width: 768px)', false)
      vi.stubGlobal('matchMedia', vi.fn(() => mqlStub))

      const { result } = renderHook(() => useIsDesktop())

      expect(result.current).toBe(false)
    })

    it('calls window.matchMedia with the correct Tailwind md breakpoint query', () => {
      renderHook(() => useIsDesktop())

      // matchMedia is called both in the useState initializer AND in the effect.
      expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 768px)')
    })

  })

  // ── event listener registration ─────────────────────────────────────────────

  describe('event listener registration', () => {
    it('adds a change listener on the MediaQueryList after mount', () => {
      renderHook(() => useIsDesktop())

      expect(mqlStub.addEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      )
    })

    it('adds exactly one change listener per mount', () => {
      renderHook(() => useIsDesktop())

      const changeCalls = mqlStub.addEventListener.mock.calls.filter(
        ([event]) => event === 'change',
      )
      expect(changeCalls).toHaveLength(1)
    })
  })

  // ── reactive updates ─────────────────────────────────────────────────────────

  describe('reactive updates', () => {
    it('switches from true to false when a non-matching change event fires', () => {
      mqlStub = makeMqlStub('(min-width: 768px)', true)
      vi.stubGlobal('matchMedia', vi.fn(() => mqlStub))

      const { result } = renderHook(() => useIsDesktop())
      expect(result.current).toBe(true)

      act(() => mqlStub.fireChange(false))

      expect(result.current).toBe(false)
    })

    it('switches from false to true when a matching change event fires', () => {
      mqlStub = makeMqlStub('(min-width: 768px)', false)
      vi.stubGlobal('matchMedia', vi.fn(() => mqlStub))

      const { result } = renderHook(() => useIsDesktop())
      expect(result.current).toBe(false)

      act(() => mqlStub.fireChange(true))

      expect(result.current).toBe(true)
    })

    it('handles multiple successive change events correctly', () => {
      mqlStub = makeMqlStub('(min-width: 768px)', true)
      vi.stubGlobal('matchMedia', vi.fn(() => mqlStub))

      const { result } = renderHook(() => useIsDesktop())

      act(() => mqlStub.fireChange(false))
      expect(result.current).toBe(false)

      act(() => mqlStub.fireChange(true))
      expect(result.current).toBe(true)

      act(() => mqlStub.fireChange(false))
      expect(result.current).toBe(false)
    })

    it('ignores a change event that fires matches=true when already true', () => {
      // Redundant event — value must remain true, no error thrown.
      mqlStub = makeMqlStub('(min-width: 768px)', true)
      vi.stubGlobal('matchMedia', vi.fn(() => mqlStub))

      const { result } = renderHook(() => useIsDesktop())

      expect(() => act(() => mqlStub.fireChange(true))).not.toThrow()
      expect(result.current).toBe(true)
    })
  })

  // ── cleanup / unmount ────────────────────────────────────────────────────────

  describe('cleanup on unmount', () => {
    it('removes the change listener when the hook unmounts', () => {
      const { unmount } = renderHook(() => useIsDesktop())

      act(() => unmount())

      expect(mqlStub.removeEventListener).toHaveBeenCalledWith(
        'change',
        expect.any(Function),
      )
    })

    it('removes the exact same handler reference that was registered', () => {
      const { unmount } = renderHook(() => useIsDesktop())

      const addedHandler = mqlStub.addEventListener.mock.calls.find(
        ([event]) => event === 'change',
      )?.[1]

      act(() => unmount())

      const removedHandler = mqlStub.removeEventListener.mock.calls.find(
        ([event]) => event === 'change',
      )?.[1]

      // Must be the same function reference — not just any function.
      expect(removedHandler).toBe(addedHandler)
    })

    it('stops responding to change events after unmount — does not throw', () => {
      mqlStub = makeMqlStub('(min-width: 768px)', true)
      vi.stubGlobal('matchMedia', vi.fn(() => mqlStub))

      const { unmount } = renderHook(() => useIsDesktop())

      act(() => unmount())

      // After unmount the listener was removed from the stub's internal list,
      // so fireChange just iterates an empty array — no throw.
      expect(() => act(() => mqlStub.fireChange(false))).not.toThrow()
    })

    it('calls removeEventListener exactly once on unmount', () => {
      const { unmount } = renderHook(() => useIsDesktop())

      act(() => unmount())

      const changeCalls = mqlStub.removeEventListener.mock.calls.filter(
        ([event]) => event === 'change',
      )
      expect(changeCalls).toHaveLength(1)
    })
  })
})
