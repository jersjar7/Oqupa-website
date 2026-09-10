// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useExpansionPopup } from '@/hooks/useExpansionPopup'

const COLLAPSED_KEY = 'oqupa_popup_collapsed'
const SHOW_DELAY_MS = 5000
const SUCCESS_DISPLAY_MS = 3000

// ---------------------------------------------------------------------------
// localStorage stub
// ---------------------------------------------------------------------------
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return Object.prototype.hasOwnProperty.call(this.store, key) ? this.store[key] : null
  },
  setItem(key: string, value: string) {
    this.store[key] = value
  },
  removeItem(key: string) {
    delete this.store[key]
  },
  clear() {
    this.store = {}
  },
}

beforeEach(() => {
  localStorageMock.clear()
  vi.stubGlobal('localStorage', localStorageMock)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// Return shape
// ---------------------------------------------------------------------------
describe('useExpansionPopup — return shape', () => {
  it('returns the expected API surface', () => {
    const { result } = renderHook(() => useExpansionPopup())
    expect(result.current).toHaveProperty('isReady')
    expect(result.current).toHaveProperty('isExpanded')
    expect(result.current).toHaveProperty('collapse')
    expect(result.current).toHaveProperty('expand')
    expect(result.current).toHaveProperty('markJoined')
    expect(typeof result.current.collapse).toBe('function')
    expect(typeof result.current.expand).toBe('function')
    expect(typeof result.current.markJoined).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// isReady — delayed by SHOW_DELAY_MS
// ---------------------------------------------------------------------------
describe('useExpansionPopup — isReady', () => {
  it('starts as false before the delay expires', () => {
    const { result } = renderHook(() => useExpansionPopup())
    expect(result.current.isReady).toBe(false)
  })

  it('becomes true after the 5-second delay', () => {
    const { result } = renderHook(() => useExpansionPopup())
    expect(result.current.isReady).toBe(false)

    act(() => {
      vi.advanceTimersByTime(SHOW_DELAY_MS)
    })

    expect(result.current.isReady).toBe(true)
  })

  it('is still false just before the delay expires', () => {
    const { result } = renderHook(() => useExpansionPopup())

    act(() => {
      vi.advanceTimersByTime(SHOW_DELAY_MS - 1)
    })

    expect(result.current.isReady).toBe(false)
  })

  it('clears the timer on unmount so no state update fires after unmount', () => {
    const { result, unmount } = renderHook(() => useExpansionPopup())
    expect(result.current.isReady).toBe(false)

    unmount()

    // Advancing timers after unmount should not throw (timer was cleared)
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(SHOW_DELAY_MS)
      })
    }).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// isExpanded — initial state from localStorage
// ---------------------------------------------------------------------------
describe('useExpansionPopup — isExpanded initial state', () => {
  it('is true (expanded) when COLLAPSED_KEY is absent from localStorage', () => {
    // localStorageMock is clean — key not present
    const { result } = renderHook(() => useExpansionPopup())
    expect(result.current.isExpanded).toBe(true)
  })

  it('is false (collapsed) when COLLAPSED_KEY is present in localStorage', () => {
    localStorageMock.setItem(COLLAPSED_KEY, 'true')
    const { result } = renderHook(() => useExpansionPopup())
    expect(result.current.isExpanded).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// collapse()
// ---------------------------------------------------------------------------
describe('useExpansionPopup — collapse()', () => {
  it('sets isExpanded to false', () => {
    const { result } = renderHook(() => useExpansionPopup())
    expect(result.current.isExpanded).toBe(true)

    act(() => {
      result.current.collapse()
    })

    expect(result.current.isExpanded).toBe(false)
  })

  it('persists COLLAPSED_KEY to localStorage', () => {
    const { result } = renderHook(() => useExpansionPopup())

    act(() => {
      result.current.collapse()
    })

    expect(localStorageMock.getItem(COLLAPSED_KEY)).toBe('true')
  })

  it('is idempotent — calling twice stays collapsed', () => {
    const { result } = renderHook(() => useExpansionPopup())

    act(() => {
      result.current.collapse()
      result.current.collapse()
    })

    expect(result.current.isExpanded).toBe(false)
    expect(localStorageMock.getItem(COLLAPSED_KEY)).toBe('true')
  })
})

// ---------------------------------------------------------------------------
// expand()
// ---------------------------------------------------------------------------
describe('useExpansionPopup — expand()', () => {
  it('sets isExpanded to true from collapsed state', () => {
    localStorageMock.setItem(COLLAPSED_KEY, 'true')
    const { result } = renderHook(() => useExpansionPopup())
    expect(result.current.isExpanded).toBe(false)

    act(() => {
      result.current.expand()
    })

    expect(result.current.isExpanded).toBe(true)
  })

  it('does NOT write to localStorage (expand is session-only)', () => {
    localStorageMock.setItem(COLLAPSED_KEY, 'true')
    const { result } = renderHook(() => useExpansionPopup())

    act(() => {
      result.current.expand()
    })

    // The key that was there before should still be there (expand does not touch it)
    expect(localStorageMock.getItem(COLLAPSED_KEY)).toBe('true')
  })

  it('is idempotent — calling twice stays expanded', () => {
    const { result } = renderHook(() => useExpansionPopup())

    act(() => {
      result.current.expand()
      result.current.expand()
    })

    expect(result.current.isExpanded).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// collapse() → expand() round-trip
// ---------------------------------------------------------------------------
describe('useExpansionPopup — collapse / expand round-trip', () => {
  it('can re-expand after collapsing within the same session', () => {
    const { result } = renderHook(() => useExpansionPopup())
    expect(result.current.isExpanded).toBe(true)

    act(() => { result.current.collapse() })
    expect(result.current.isExpanded).toBe(false)

    act(() => { result.current.expand() })
    expect(result.current.isExpanded).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// markJoined()
// ---------------------------------------------------------------------------
describe('useExpansionPopup — markJoined()', () => {
  it('does NOT immediately change isExpanded', () => {
    const { result } = renderHook(() => useExpansionPopup())
    expect(result.current.isExpanded).toBe(true)

    act(() => {
      result.current.markJoined()
    })

    // Still expanded — the timeout has not fired yet
    expect(result.current.isExpanded).toBe(true)
  })

  it('does not set localStorage before the timeout fires', () => {
    const { result } = renderHook(() => useExpansionPopup())

    act(() => {
      result.current.markJoined()
    })

    expect(localStorageMock.getItem(COLLAPSED_KEY)).toBeNull()
  })

  it('collapses isExpanded after SUCCESS_DISPLAY_MS', () => {
    const { result } = renderHook(() => useExpansionPopup())

    act(() => {
      result.current.markJoined()
    })

    act(() => {
      vi.advanceTimersByTime(SUCCESS_DISPLAY_MS)
    })

    expect(result.current.isExpanded).toBe(false)
  })

  it('persists COLLAPSED_KEY to localStorage after SUCCESS_DISPLAY_MS', () => {
    const { result } = renderHook(() => useExpansionPopup())

    act(() => {
      result.current.markJoined()
    })

    act(() => {
      vi.advanceTimersByTime(SUCCESS_DISPLAY_MS)
    })

    expect(localStorageMock.getItem(COLLAPSED_KEY)).toBe('true')
  })

  it('is still expanded just before the timeout fires', () => {
    const { result } = renderHook(() => useExpansionPopup())

    act(() => {
      result.current.markJoined()
    })

    act(() => {
      vi.advanceTimersByTime(SUCCESS_DISPLAY_MS - 1)
    })

    expect(result.current.isExpanded).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// isReady and markJoined timers are independent
// ---------------------------------------------------------------------------
describe('useExpansionPopup — simultaneous timers', () => {
  it('isReady fires at 5s even while markJoined timer is pending', () => {
    const { result } = renderHook(() => useExpansionPopup())

    act(() => {
      result.current.markJoined()
      vi.advanceTimersByTime(SUCCESS_DISPLAY_MS) // 3s — markJoined fires, not isReady yet
    })

    expect(result.current.isReady).toBe(false)
    expect(result.current.isExpanded).toBe(false)

    act(() => {
      vi.advanceTimersByTime(SHOW_DELAY_MS - SUCCESS_DISPLAY_MS) // remaining 2s
    })

    expect(result.current.isReady).toBe(true)
  })

  it('markJoined fires at 3s and isReady fires at 5s independently', () => {
    const { result } = renderHook(() => useExpansionPopup())

    act(() => {
      result.current.markJoined()
    })

    // At 3s: markJoined collapses
    act(() => { vi.advanceTimersByTime(SUCCESS_DISPLAY_MS) })
    expect(result.current.isExpanded).toBe(false)
    expect(result.current.isReady).toBe(false)

    // At 5s: isReady becomes true
    act(() => { vi.advanceTimersByTime(SHOW_DELAY_MS - SUCCESS_DISPLAY_MS) })
    expect(result.current.isReady).toBe(true)
    expect(result.current.isExpanded).toBe(false)
  })
})
