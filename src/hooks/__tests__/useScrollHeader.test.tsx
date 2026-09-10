// @vitest-environment jsdom

import { render, screen, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useScrollHeader } from '@/hooks/useScrollHeader'

// ── IntersectionObserver mock ────────────────────────────────────────────────
//
// jsdom has no IntersectionObserver. We stub it before each test with a fake
// that records the callback so tests can trigger intersection events manually.

let ioCallback: IntersectionObserverCallback
let IOConstructor: ReturnType<typeof vi.fn>
let disconnectMock: ReturnType<typeof vi.fn>
let observeMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  disconnectMock = vi.fn()
  observeMock = vi.fn()
  IOConstructor = vi.fn(function(cb: IntersectionObserverCallback) {
    ioCallback = cb
    return { observe: observeMock, unobserve: vi.fn(), disconnect: disconnectMock }
  })
  vi.stubGlobal('IntersectionObserver', IOConstructor)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── Fixture ──────────────────────────────────────────────────────────────────
//
// The hook's heroRef must be attached to a real DOM element for the useEffect
// to proceed past the `if (!hero) return` guard. A small Fixture component
// wires the ref and exposes isScrolled through a data attribute for assertion.

function Fixture() {
  const { heroRef, isScrolled } = useScrollHeader()
  return (
    <div
      data-testid="hero"
      ref={heroRef as React.RefObject<HTMLDivElement>}
      data-scrolled={String(isScrolled)}
    />
  )
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useScrollHeader', () => {
  describe('initial state', () => {
    it('isScrolled starts as false', () => {
      render(<Fixture />)
      expect(screen.getByTestId('hero').dataset.scrolled).toBe('false')
    })

    it('returns isScrolled and heroRef', () => {
      const { result } = renderHook(() => useScrollHeader())
      expect(result.current).toHaveProperty('isScrolled', false)
      expect(result.current).toHaveProperty('heroRef')
      expect(result.current.heroRef).toBeDefined()
    })
  })

  describe('IntersectionObserver creation', () => {
    it('creates an IntersectionObserver when heroRef is attached to a DOM element', () => {
      render(<Fixture />)
      expect(IOConstructor).toHaveBeenCalledOnce()
    })

    it('does not create an observer when heroRef has no element attached', () => {
      // renderHook does not attach the returned heroRef to a DOM node,
      // so heroRef.current stays null and the useEffect returns early.
      renderHook(() => useScrollHeader())
      expect(IOConstructor).not.toHaveBeenCalled()
    })

    it('passes rootMargin "0px 0px -60px 0px" to the observer', () => {
      render(<Fixture />)
      expect(IOConstructor).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ rootMargin: '0px 0px -60px 0px' }),
      )
    })

    it('passes threshold 0 to the observer', () => {
      render(<Fixture />)
      expect(IOConstructor).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ threshold: 0 }),
      )
    })

    it('calls observe() with the hero element', () => {
      render(<Fixture />)
      const heroEl = screen.getByTestId('hero')
      expect(observeMock).toHaveBeenCalledWith(heroEl)
    })
  })

  describe('intersection behaviour', () => {
    it('sets isScrolled to true when the hero is NOT intersecting (scrolled past)', () => {
      render(<Fixture />)
      act(() => {
        ioCallback(
          [{ isIntersecting: false } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        )
      })
      expect(screen.getByTestId('hero').dataset.scrolled).toBe('true')
    })

    it('sets isScrolled to false when the hero IS intersecting (at the top)', () => {
      render(<Fixture />)
      // First scroll down to get isScrolled = true
      act(() => {
        ioCallback(
          [{ isIntersecting: false } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        )
      })
      expect(screen.getByTestId('hero').dataset.scrolled).toBe('true')

      // Now scroll back up — hero becomes visible again
      act(() => {
        ioCallback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        )
      })
      expect(screen.getByTestId('hero').dataset.scrolled).toBe('false')
    })

    it('remains false when hero starts intersecting', () => {
      render(<Fixture />)
      act(() => {
        ioCallback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        )
      })
      expect(screen.getByTestId('hero').dataset.scrolled).toBe('false')
    })

    it('toggles correctly across multiple intersection changes', () => {
      render(<Fixture />)
      const el = screen.getByTestId('hero')

      act(() => {
        ioCallback(
          [{ isIntersecting: false } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        )
      })
      expect(el.dataset.scrolled).toBe('true')

      act(() => {
        ioCallback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        )
      })
      expect(el.dataset.scrolled).toBe('false')

      act(() => {
        ioCallback(
          [{ isIntersecting: false } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        )
      })
      expect(el.dataset.scrolled).toBe('true')
    })
  })

  describe('cleanup', () => {
    it('disconnects the observer on unmount', () => {
      const { unmount } = render(<Fixture />)
      unmount()
      expect(disconnectMock).toHaveBeenCalledOnce()
    })

    it('does not disconnect when no observer was created (null ref)', () => {
      const { unmount } = renderHook(() => useScrollHeader())
      unmount()
      expect(disconnectMock).not.toHaveBeenCalled()
    })
  })
})
