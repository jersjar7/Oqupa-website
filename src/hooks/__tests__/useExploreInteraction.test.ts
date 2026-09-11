// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExploreInteraction } from '@/hooks/useExploreInteraction'

// ── helpers ───────────────────────────────────────────────────────────────────

/** Fire a keydown event on the window. */
function fireKeydown(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('useExploreInteraction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ── initial state ────────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with hoveredId = null', () => {
      const { result } = renderHook(() => useExploreInteraction())
      expect(result.current.hoveredId).toBeNull()
    })

    it('starts with selectedId = null', () => {
      const { result } = renderHook(() => useExploreInteraction())
      expect(result.current.selectedId).toBeNull()
    })

    it('returns panelRef as a ref object', () => {
      const { result } = renderHook(() => useExploreInteraction())
      expect(result.current.panelRef).toBeDefined()
      expect(Object.prototype.hasOwnProperty.call(result.current.panelRef, 'current')).toBe(true)
      expect(result.current.panelRef.current).toBeNull()
    })

    it('returns handleMarkerHover, handleMarkerClick, and handleDismiss as functions', () => {
      const { result } = renderHook(() => useExploreInteraction())
      expect(typeof result.current.handleMarkerHover).toBe('function')
      expect(typeof result.current.handleMarkerClick).toBe('function')
      expect(typeof result.current.handleDismiss).toBe('function')
    })
  })

  // ── handleMarkerHover ────────────────────────────────────────────────────────

  describe('handleMarkerHover', () => {
    it('sets hoveredId immediately when a non-null id is passed', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerHover('listing-1'))
      expect(result.current.hoveredId).toBe('listing-1')
    })

    it('updates hoveredId to a new non-null id immediately', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerHover('listing-1'))
      act(() => result.current.handleMarkerHover('listing-2'))
      expect(result.current.hoveredId).toBe('listing-2')
    })

    it('does NOT clear hoveredId immediately when null is passed', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerHover('listing-1'))

      // Pass null — should NOT clear immediately due to 75ms debounce.
      act(() => result.current.handleMarkerHover(null))

      expect(result.current.hoveredId).toBe('listing-1')
    })

    it('clears hoveredId after the 75ms debounce when null is passed', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerHover('listing-1'))

      act(() => result.current.handleMarkerHover(null))

      // Timer has not fired yet — still set.
      expect(result.current.hoveredId).toBe('listing-1')

      act(() => vi.advanceTimersByTime(75))

      expect(result.current.hoveredId).toBeNull()
    })

    it('hoveredId is still set just before the 75ms debounce fires', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerHover('listing-1'))
      act(() => result.current.handleMarkerHover(null))

      act(() => vi.advanceTimersByTime(74))

      expect(result.current.hoveredId).toBe('listing-1')
    })

    it('cancels the debounce timeout when a new non-null id arrives before it fires', () => {
      const { result } = renderHook(() => useExploreInteraction())

      // Hover marker-A, then immediately hover away (null), then hover marker-B
      // before the 75ms window expires. The debounce should be cancelled so
      // hoveredId snaps straight to marker-B without ever becoming null.
      act(() => result.current.handleMarkerHover('marker-A'))
      act(() => result.current.handleMarkerHover(null))
      act(() => result.current.handleMarkerHover('marker-B'))

      expect(result.current.hoveredId).toBe('marker-B')

      // Advance past the original debounce window — still marker-B, not null.
      act(() => vi.advanceTimersByTime(75))

      expect(result.current.hoveredId).toBe('marker-B')
    })

    it('cancels a pending null debounce when a second null arrives', () => {
      // Each null call should reset the 75ms window (debounce re-starts).
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerHover('listing-1'))

      // First null call at t=0 — starts 75ms timer.
      act(() => result.current.handleMarkerHover(null))
      act(() => vi.advanceTimersByTime(50)) // t=50, timer not fired yet

      // Second null call at t=50 — cancels first timer, starts a new 75ms timer.
      act(() => result.current.handleMarkerHover(null))
      act(() => vi.advanceTimersByTime(74)) // t=124, new timer still has 1ms left

      expect(result.current.hoveredId).toBe('listing-1')

      act(() => vi.advanceTimersByTime(1)) // t=125, new timer fires

      expect(result.current.hoveredId).toBeNull()
    })

    it('handleMarkerHover reference is stable across re-renders (useCallback)', () => {
      const { result, rerender } = renderHook(() => useExploreInteraction())
      const first = result.current.handleMarkerHover
      rerender()
      expect(result.current.handleMarkerHover).toBe(first)
    })
  })

  // ── handleMarkerClick ────────────────────────────────────────────────────────

  describe('handleMarkerClick', () => {
    it('sets selectedId to the given id', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerClick('listing-42'))
      expect(result.current.selectedId).toBe('listing-42')
    })

    it('updates selectedId when called with a different id', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerClick('listing-1'))
      act(() => result.current.handleMarkerClick('listing-2'))
      expect(result.current.selectedId).toBe('listing-2')
    })

    it('sets selectedId to null when null is passed', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerClick('listing-1'))
      act(() => result.current.handleMarkerClick(null))
      expect(result.current.selectedId).toBeNull()
    })

    it('does not throw when panelRef.current is null', () => {
      const { result } = renderHook(() => useExploreInteraction())
      // panelRef starts null — clicking should not throw.
      expect(() => act(() => result.current.handleMarkerClick('listing-1'))).not.toThrow()
    })

    it('calls scrollIntoView on the matching card when panelRef is populated', () => {
      const { result } = renderHook(() => useExploreInteraction())

      // Build a small DOM tree to simulate the listing panel.
      const panel = document.createElement('div')
      const card = document.createElement('div')
      card.setAttribute('data-listing-id', 'listing-99')
      const scrollIntoView = vi.fn()
      card.scrollIntoView = scrollIntoView
      panel.appendChild(card)
      document.body.appendChild(panel)

      // Point panelRef at the panel element.
      act(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(result.current.panelRef as any).current = panel
      })

      act(() => result.current.handleMarkerClick('listing-99'))

      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest' })

      document.body.removeChild(panel)
    })

    it('does not call scrollIntoView when the card is not found in the panel', () => {
      const { result } = renderHook(() => useExploreInteraction())

      const panel = document.createElement('div')
      // No card with data-listing-id="listing-X" is added.
      document.body.appendChild(panel)

      act(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(result.current.panelRef as any).current = panel
      })

      // Should not throw — querySelector returns null and optional chaining skips.
      expect(() => act(() => result.current.handleMarkerClick('listing-X'))).not.toThrow()

      document.body.removeChild(panel)
    })

    it('does not call scrollIntoView when null is passed', () => {
      const { result } = renderHook(() => useExploreInteraction())

      const panel = document.createElement('div')
      const card = document.createElement('div')
      card.setAttribute('data-listing-id', 'listing-1')
      const scrollIntoView = vi.fn()
      card.scrollIntoView = scrollIntoView
      panel.appendChild(card)

      act(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(result.current.panelRef as any).current = panel
      })

      act(() => result.current.handleMarkerClick(null))

      expect(scrollIntoView).not.toHaveBeenCalled()
    })

    it('handleMarkerClick reference is stable across re-renders (useCallback)', () => {
      const { result, rerender } = renderHook(() => useExploreInteraction())
      const first = result.current.handleMarkerClick
      rerender()
      expect(result.current.handleMarkerClick).toBe(first)
    })
  })

  // ── handleDismiss ────────────────────────────────────────────────────────────

  describe('handleDismiss', () => {
    it('clears hoveredId to null', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerHover('listing-1'))
      act(() => result.current.handleDismiss())
      expect(result.current.hoveredId).toBeNull()
    })

    it('clears selectedId to null', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerClick('listing-2'))
      act(() => result.current.handleDismiss())
      expect(result.current.selectedId).toBeNull()
    })

    it('clears both hoveredId and selectedId in one call', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerHover('listing-A'))
      act(() => result.current.handleMarkerClick('listing-B'))
      act(() => result.current.handleDismiss())
      expect(result.current.hoveredId).toBeNull()
      expect(result.current.selectedId).toBeNull()
    })

    it('is idempotent — calling dismiss twice is a no-op', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerHover('listing-1'))
      act(() => result.current.handleDismiss())
      expect(() => act(() => result.current.handleDismiss())).not.toThrow()
      expect(result.current.hoveredId).toBeNull()
      expect(result.current.selectedId).toBeNull()
    })

    it('clears hoveredId even when the debounce timeout is pending', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerHover('listing-1'))
      act(() => result.current.handleMarkerHover(null)) // starts 75ms timeout

      // Dismiss fires before the debounce resolves.
      act(() => result.current.handleDismiss())

      expect(result.current.hoveredId).toBeNull()
    })

    it('handleDismiss reference is stable across re-renders (useCallback)', () => {
      const { result, rerender } = renderHook(() => useExploreInteraction())
      const first = result.current.handleDismiss
      rerender()
      expect(result.current.handleDismiss).toBe(first)
    })
  })

  // ── Escape key listener ───────────────────────────────────────────────────────

  describe('Escape key listener', () => {
    it('clears hoveredId when Escape is pressed', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerHover('listing-1'))

      fireKeydown('Escape')

      expect(result.current.hoveredId).toBeNull()
    })

    it('clears selectedId when Escape is pressed', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerClick('listing-2'))

      fireKeydown('Escape')

      expect(result.current.selectedId).toBeNull()
    })

    it('clears both hoveredId and selectedId when Escape is pressed', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerHover('listing-A'))
      act(() => result.current.handleMarkerClick('listing-B'))

      fireKeydown('Escape')

      expect(result.current.hoveredId).toBeNull()
      expect(result.current.selectedId).toBeNull()
    })

    it('does not react to other keys', () => {
      const { result } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerHover('listing-1'))
      act(() => result.current.handleMarkerClick('listing-2'))

      fireKeydown('Enter')
      fireKeydown('Tab')
      fireKeydown('ArrowDown')

      expect(result.current.hoveredId).toBe('listing-1')
      expect(result.current.selectedId).toBe('listing-2')
    })

    it('does not throw when Escape is pressed with no active state', () => {
      renderHook(() => useExploreInteraction())
      expect(() => fireKeydown('Escape')).not.toThrow()
    })

    it('stops responding to Escape after unmount', () => {
      const removeListenerSpy = vi.spyOn(window, 'removeEventListener')
      const { result, unmount } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerClick('listing-1'))

      act(() => unmount())

      // The keydown listener must have been removed from window during cleanup.
      expect(removeListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    })

    it('remains responsive to Escape across multiple state cycles', () => {
      const { result } = renderHook(() => useExploreInteraction())

      // First cycle.
      act(() => result.current.handleMarkerClick('listing-1'))
      fireKeydown('Escape')
      expect(result.current.selectedId).toBeNull()

      // Second cycle — listener must still be registered.
      act(() => result.current.handleMarkerClick('listing-2'))
      fireKeydown('Escape')
      expect(result.current.selectedId).toBeNull()
    })
  })

  // ── debounce timer cleanup on unmount ─────────────────────────────────────────

  describe('debounce timer cleanup on unmount', () => {
    it('clears the pending debounce timeout on unmount', () => {
      const { result, unmount } = renderHook(() => useExploreInteraction())
      act(() => result.current.handleMarkerHover('listing-1'))
      act(() => result.current.handleMarkerHover(null)) // starts 75ms debounce

      // One pending timer before unmount.
      expect(vi.getTimerCount()).toBe(1)

      // Unmount while debounce is still pending — cleanup must clear the timeout.
      act(() => unmount())

      // Zero pending timers confirms clearTimeout was called by the cleanup effect.
      expect(vi.getTimerCount()).toBe(0)
    })

    it('does not throw when unmounted before any hover interaction', () => {
      const { unmount } = renderHook(() => useExploreInteraction())
      expect(() => act(() => unmount())).not.toThrow()
    })
  })
})
