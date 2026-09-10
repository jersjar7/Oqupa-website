// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { useInfiniteScroll } from '../useInfiniteScroll'

// ── IntersectionObserver mock ─────────────────────────────────────────────────
//
// jsdom does not implement IntersectionObserver. We stub it globally so we can
// capture the callback and the options passed to the constructor, then trigger
// intersection events manually inside each test.

type IOCallback = (entries: IntersectionObserverEntry[]) => void

let ioCallback: IOCallback
let ioOptions: IntersectionObserverInit | undefined
let observeMock: ReturnType<typeof vi.fn>
let disconnectMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  observeMock = vi.fn()
  disconnectMock = vi.fn()

  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn(function (cb: IOCallback, options?: IntersectionObserverInit) {
      ioCallback = cb
      ioOptions = options
      return {
        observe: observeMock,
        unobserve: vi.fn(),
        disconnect: disconnectMock,
      }
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── Fixture component ─────────────────────────────────────────────────────────
//
// useInfiniteScroll returns a ref that must be attached to a real DOM element
// so the useEffect can call observer.observe(sentinel). renderHook cannot do
// this because there is no rendered element; a small Fixture component wires
// the ref instead.

interface FixtureProps {
  onLoadMore: () => void
  enabled: boolean
}

function Fixture({ onLoadMore, enabled }: FixtureProps) {
  const sentinelRef = useInfiniteScroll(onLoadMore, enabled)
  return <div data-testid="sentinel" ref={sentinelRef} />
}

// Helper that fires an intersection event on the captured callback.
function triggerIntersect(isIntersecting: boolean) {
  act(() => {
    ioCallback([{ isIntersecting } as IntersectionObserverEntry])
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useInfiniteScroll', () => {
  describe('returned ref', () => {
    it('returns a ref that is attached to the sentinel DOM element', () => {
      const onLoadMore = vi.fn()
      const { getByTestId } = render(<Fixture onLoadMore={onLoadMore} enabled={true} />)

      // The sentinel element exists in the document.
      expect(getByTestId('sentinel')).toBeTruthy()
    })
  })

  describe('IntersectionObserver setup', () => {
    it('creates an IntersectionObserver with rootMargin of 200px', () => {
      const onLoadMore = vi.fn()
      render(<Fixture onLoadMore={onLoadMore} enabled={true} />)

      expect(IntersectionObserver).toHaveBeenCalledOnce()
      expect(ioOptions).toEqual({ rootMargin: '200px' })
    })

    it('calls observer.observe with the sentinel element', () => {
      const onLoadMore = vi.fn()
      const { getByTestId } = render(<Fixture onLoadMore={onLoadMore} enabled={true} />)

      expect(observeMock).toHaveBeenCalledOnce()
      expect(observeMock).toHaveBeenCalledWith(getByTestId('sentinel'))
    })
  })

  describe('onLoadMore invocation — enabled = true', () => {
    it('calls onLoadMore when the sentinel intersects and enabled is true', () => {
      const onLoadMore = vi.fn()
      render(<Fixture onLoadMore={onLoadMore} enabled={true} />)

      triggerIntersect(true)

      expect(onLoadMore).toHaveBeenCalledOnce()
    })

    it('does not call onLoadMore when isIntersecting is false even if enabled is true', () => {
      const onLoadMore = vi.fn()
      render(<Fixture onLoadMore={onLoadMore} enabled={true} />)

      triggerIntersect(false)

      expect(onLoadMore).not.toHaveBeenCalled()
    })

    it('calls onLoadMore each time the sentinel re-intersects', () => {
      const onLoadMore = vi.fn()
      render(<Fixture onLoadMore={onLoadMore} enabled={true} />)

      triggerIntersect(true)
      triggerIntersect(false)
      triggerIntersect(true)

      expect(onLoadMore).toHaveBeenCalledTimes(2)
    })
  })

  describe('onLoadMore invocation — enabled = false', () => {
    it('does not call onLoadMore when enabled is false even if the sentinel intersects', () => {
      const onLoadMore = vi.fn()
      render(<Fixture onLoadMore={onLoadMore} enabled={false} />)

      triggerIntersect(true)

      expect(onLoadMore).not.toHaveBeenCalled()
    })

    it('does not call onLoadMore when both isIntersecting is false and enabled is false', () => {
      const onLoadMore = vi.fn()
      render(<Fixture onLoadMore={onLoadMore} enabled={false} />)

      triggerIntersect(false)

      expect(onLoadMore).not.toHaveBeenCalled()
    })
  })

  describe('enabled flag change', () => {
    it('calls onLoadMore after enabled transitions from false to true and the sentinel intersects', () => {
      const onLoadMore = vi.fn()
      const { rerender } = render(<Fixture onLoadMore={onLoadMore} enabled={false} />)

      // While disabled — intersection must be ignored.
      triggerIntersect(true)
      expect(onLoadMore).not.toHaveBeenCalled()

      // Enable — the observer is re-created with the new callback.
      act(() => {
        rerender(<Fixture onLoadMore={onLoadMore} enabled={true} />)
      })

      // New intersection with the updated callback must trigger the call.
      triggerIntersect(true)
      expect(onLoadMore).toHaveBeenCalledOnce()
    })

    it('stops calling onLoadMore after enabled transitions from true to false', () => {
      const onLoadMore = vi.fn()
      const { rerender } = render(<Fixture onLoadMore={onLoadMore} enabled={true} />)

      triggerIntersect(true)
      expect(onLoadMore).toHaveBeenCalledTimes(1)

      act(() => {
        rerender(<Fixture onLoadMore={onLoadMore} enabled={false} />)
      })

      triggerIntersect(true)
      // Count must not increase.
      expect(onLoadMore).toHaveBeenCalledTimes(1)
    })
  })

  describe('cleanup on unmount', () => {
    it('calls observer.disconnect when the component unmounts', () => {
      const onLoadMore = vi.fn()
      const { unmount } = render(<Fixture onLoadMore={onLoadMore} enabled={true} />)

      act(() => {
        unmount()
      })

      expect(disconnectMock).toHaveBeenCalledOnce()
    })
  })

  describe('observer recreation on prop change', () => {
    it('creates a new observer when onLoadMore reference changes', () => {
      const first = vi.fn()
      const second = vi.fn()
      const { rerender } = render(<Fixture onLoadMore={first} enabled={true} />)

      // Initial observer.
      expect(IntersectionObserver).toHaveBeenCalledTimes(1)

      act(() => {
        rerender(<Fixture onLoadMore={second} enabled={true} />)
      })

      // A second observer must have been created for the new callback.
      expect(IntersectionObserver).toHaveBeenCalledTimes(2)

      // The new intersection triggers the second callback, not the first.
      triggerIntersect(true)
      expect(second).toHaveBeenCalledOnce()
      expect(first).not.toHaveBeenCalled()
    })
  })
})
