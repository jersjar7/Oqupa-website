// @vitest-environment jsdom

import { render, screen, act } from '@testing-library/react'
import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useAnimateOnScroll } from '@/hooks/useAnimateOnScroll'

// ── IntersectionObserver mock ────────────────────────────────────────────────
//
// jsdom has no IntersectionObserver. We stub it before each test with a fake
// that records the callback so tests can trigger intersection events manually.

let ioCallback: IntersectionObserverCallback
let IOConstructor: ReturnType<typeof vi.fn>
let unobserveMock: ReturnType<typeof vi.fn>
let disconnectMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  unobserveMock = vi.fn()
  disconnectMock = vi.fn()
  IOConstructor = vi.fn(function(cb: IntersectionObserverCallback) {
    ioCallback = cb
    return { observe: vi.fn(), unobserve: unobserveMock, disconnect: disconnectMock }
  })
  vi.stubGlobal('IntersectionObserver', IOConstructor)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── Fixture ──────────────────────────────────────────────────────────────────
//
// The hook's ref must be attached to a real DOM element for the useEffect to
// proceed past the `if (!el) return` guard. A small Fixture component wires
// the ref and exposes isVisible through a data attribute for easy assertion.

function Fixture({ threshold }: { threshold?: number } = {}) {
  const { ref, isVisible } = useAnimateOnScroll(
    threshold !== undefined ? { threshold } : undefined,
  )
  return <div data-testid="el" ref={ref} data-visible={String(isVisible)} />
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useAnimateOnScroll', () => {
  it('isVisible starts as false', () => {
    render(<Fixture />)
    expect(screen.getByTestId('el').dataset.visible).toBe('false')
  })

  it('does not set isVisible to true when the entry is not intersecting', () => {
    render(<Fixture />)
    act(() => {
      ioCallback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    expect(screen.getByTestId('el').dataset.visible).toBe('false')
  })

  it('sets isVisible to true when the element intersects', () => {
    render(<Fixture />)
    act(() => {
      ioCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    expect(screen.getByTestId('el').dataset.visible).toBe('true')
  })

  it('disconnects the observer on unmount', () => {
    const { unmount } = render(<Fixture />)
    unmount()
    expect(disconnectMock).toHaveBeenCalledOnce()
  })

  describe('IntersectionObserver options', () => {
    it('uses a default threshold of 0.1', () => {
      render(<Fixture />)
      expect(IOConstructor).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ threshold: 0.1 }),
      )
    })

    it('passes a custom threshold through to the observer', () => {
      render(<Fixture threshold={0.5} />)
      expect(IOConstructor).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ threshold: 0.5 }),
      )
    })

    it('uses the correct rootMargin', () => {
      render(<Fixture />)
      expect(IOConstructor).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ rootMargin: '0px 0px -100px 0px' }),
      )
    })
  })

  it('does not create an observer when ref has no element attached', () => {
    // renderHook does not attach the returned ref to a DOM node,
    // so ref.current stays null and the useEffect returns early.
    renderHook(() => useAnimateOnScroll())
    expect(IOConstructor).not.toHaveBeenCalled()
  })

  it('calls unobserve after intersecting so the animation fires only once', () => {
    render(<Fixture />)
    act(() => {
      ioCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      )
    })
    expect(unobserveMock).toHaveBeenCalledOnce()
  })
})
