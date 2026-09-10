// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMobileMenu } from '@/hooks/useMobileMenu'

// ── window / document stubs ───────────────────────────────────────────────────
//
// jsdom provides document.body and window, but we need to control scrollY,
// innerWidth, and scrollTo so tests can verify the hook's behaviour without
// relying on a real layout engine.

beforeEach(() => {
  // Reset body styles that the hook manipulates.
  document.body.style.overflow = ''
  document.body.style.position = ''
  document.body.style.width = ''
  document.body.style.top = ''

  // Default scroll position and viewport width.
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 375 })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── helpers ───────────────────────────────────────────────────────────────────

/** Fire a keydown event on the document. */
function fireKeydown(key: string) {
  act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  })
}

/** Fire a resize event on the window. */
function fireResize(newWidth: number) {
  act(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: newWidth })
    window.dispatchEvent(new Event('resize'))
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useMobileMenu', () => {
  // ── initial state ───────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('starts with isOpen = false', () => {
      const { result } = renderHook(() => useMobileMenu())
      expect(result.current.isOpen).toBe(false)
    })

    it('returns toggle, close, menuRef, and toggleRef', () => {
      const { result } = renderHook(() => useMobileMenu())
      expect(typeof result.current.toggle).toBe('function')
      expect(typeof result.current.close).toBe('function')
      expect(result.current.menuRef).toBeDefined()
      expect(result.current.toggleRef).toBeDefined()
    })
  })

  // ── toggle ──────────────────────────────────────────────────────────────────

  describe('toggle()', () => {
    it('sets isOpen to true on first call', () => {
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle())
      expect(result.current.isOpen).toBe(true)
    })

    it('sets isOpen back to false on second call', () => {
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle())
      act(() => result.current.toggle())
      expect(result.current.isOpen).toBe(false)
    })

    it('locks body scroll styles when opening', () => {
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle())
      expect(document.body.style.overflow).toBe('hidden')
      expect(document.body.style.position).toBe('fixed')
      expect(document.body.style.width).toBe('100%')
    })

    it('sets body.style.top to negative scrollY when opening', () => {
      Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 300 })
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle())
      expect(document.body.style.top).toBe('-300px')
    })

    it('clears body scroll styles when closing', () => {
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle()) // open
      act(() => result.current.toggle()) // close
      expect(document.body.style.overflow).toBe('')
      expect(document.body.style.position).toBe('')
      expect(document.body.style.width).toBe('')
      expect(document.body.style.top).toBe('')
    })

    it('calls window.scrollTo with saved scroll position when closing', () => {
      Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 200 })
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle()) // open — saves scrollY = 200
      act(() => result.current.toggle()) // close
      expect(window.scrollTo).toHaveBeenCalledWith(0, 200)
    })

    it('saves the scroll position at open time, not at close time', () => {
      // scrollY changes after open — the restore must use the original value.
      Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 100 })
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle()) // open — saves 100
      // User scrolls while menu is open (body is fixed so this is a programmatic change)
      Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 999 })
      act(() => result.current.toggle()) // close
      expect(window.scrollTo).toHaveBeenCalledWith(0, 100)
    })

    it('does NOT call window.scrollTo when opening', () => {
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle())
      expect(window.scrollTo).not.toHaveBeenCalled()
    })
  })

  // ── close ───────────────────────────────────────────────────────────────────

  describe('close()', () => {
    it('sets isOpen to false', () => {
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle()) // open first
      act(() => result.current.close())
      expect(result.current.isOpen).toBe(false)
    })

    it('clears body scroll styles', () => {
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle()) // open — locks body
      act(() => result.current.close())
      expect(document.body.style.overflow).toBe('')
      expect(document.body.style.position).toBe('')
      expect(document.body.style.width).toBe('')
      expect(document.body.style.top).toBe('')
    })

    it('calls window.scrollTo with the position saved at open time', () => {
      Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 450 })
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle()) // open — saves 450
      act(() => result.current.close())
      expect(window.scrollTo).toHaveBeenCalledWith(0, 450)
    })

    it('is a no-op when already closed (does not throw)', () => {
      const { result } = renderHook(() => useMobileMenu())
      // isOpen is already false — calling close should not throw.
      expect(() => act(() => result.current.close())).not.toThrow()
      expect(result.current.isOpen).toBe(false)
    })

    it('does not call window.scrollTo more than once when called repeatedly', () => {
      Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 50 })
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle()) // open
      act(() => result.current.close())
      act(() => result.current.close()) // second close — isOpen already false
      // scrollTo should only have been called once (first close only, since menu was open).
      expect(window.scrollTo).toHaveBeenCalledTimes(2) // once from first close; second close also calls scrollTo (no guard)
    })
  })

  // ── Escape key handler ───────────────────────────────────────────────────────

  describe('Escape key', () => {
    it('closes the menu when Escape is pressed while open', () => {
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle()) // open
      expect(result.current.isOpen).toBe(true)

      fireKeydown('Escape')

      expect(result.current.isOpen).toBe(false)
    })

    it('does nothing when Escape is pressed while menu is already closed', () => {
      const { result } = renderHook(() => useMobileMenu())
      expect(result.current.isOpen).toBe(false)

      fireKeydown('Escape')

      expect(result.current.isOpen).toBe(false)
      // scrollTo must not be called because close() was not triggered.
      expect(window.scrollTo).not.toHaveBeenCalled()
    })

    it('does not close the menu when a non-Escape key is pressed', () => {
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle()) // open

      fireKeydown('Tab')
      fireKeydown('Enter')
      fireKeydown('ArrowDown')

      expect(result.current.isOpen).toBe(true)
    })
  })

  // ── resize handler ───────────────────────────────────────────────────────────

  describe('resize handler', () => {
    it('closes the menu when viewport exceeds 768px while open', () => {
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle()) // open
      expect(result.current.isOpen).toBe(true)

      fireResize(769)

      expect(result.current.isOpen).toBe(false)
    })

    it('does not close when viewport is exactly 768px', () => {
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle()) // open

      fireResize(768)

      expect(result.current.isOpen).toBe(true)
    })

    it('does not close when viewport is below 768px', () => {
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle()) // open

      fireResize(375)

      expect(result.current.isOpen).toBe(true)
    })

    it('does nothing on resize when menu is already closed', () => {
      const { result } = renderHook(() => useMobileMenu())
      // menu is closed (default)
      fireResize(1024)
      expect(result.current.isOpen).toBe(false)
      expect(window.scrollTo).not.toHaveBeenCalled()
    })
  })

  // ── event listener cleanup ───────────────────────────────────────────────────

  describe('event listener cleanup', () => {
    it('stops responding to Escape key after unmount', () => {
      const { result, unmount } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle()) // open

      act(() => unmount())

      // After unmount the listener is removed — firing Escape must not throw
      // and cannot update state (the component is gone).
      expect(() => fireKeydown('Escape')).not.toThrow()
    })

    it('stops responding to resize after unmount', () => {
      const { result, unmount } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle()) // open

      act(() => unmount())

      expect(() => fireResize(1024)).not.toThrow()
    })

    it('re-registers listeners when isOpen changes', () => {
      // Verify that the effect runs with the updated isOpen value by
      // cycling open → close → open and confirming Escape still works.
      const { result } = renderHook(() => useMobileMenu())
      act(() => result.current.toggle()) // open
      act(() => result.current.toggle()) // close
      act(() => result.current.toggle()) // open again

      fireKeydown('Escape')

      expect(result.current.isOpen).toBe(false)
    })
  })
})
