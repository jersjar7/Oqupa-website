// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, renderHook } from '@testing-library/react'

// ADR-051 on the website:
//   Aparición ("shown") — a listing card (list card, or the selected pin's
//     card) at least half on screen for 1 full second. Pins never count.
//   Vista ("seen") — the listing opened on purpose (the selected pin's card,
//     or the listing's own page) and kept open 2 seconds.
// The owner's own listing is never sent.

const addMock = vi.fn((..._args: unknown[]) => true)
vi.mock('@/lib/listingCounts', () => ({
  listingCounts: { add: (...args: unknown[]) => addMock(...args) },
}))

type FakeAuthState = { user: { id: string } | null }
let fakeAuth: FakeAuthState = { user: null }
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: FakeAuthState) => unknown) => selector(fakeAuth),
}))

// IntersectionObserver stub: tests drive what is on screen.
type IOCallback = (entries: Array<{ isIntersecting: boolean; intersectionRatio: number; target: Element }>) => void
let observers: Array<{ cb: IOCallback; options?: IntersectionObserverInit; targets: Element[]; disconnected: boolean }> = []
class FakeIO {
  record: (typeof observers)[number]
  constructor(cb: IOCallback, options?: IntersectionObserverInit) {
    this.record = { cb, options, targets: [], disconnected: false }
    observers.push(this.record)
  }
  observe(el: Element) { this.record.targets.push(el) }
  unobserve() {}
  disconnect() { this.record.disconnected = true }
}
function setVisible(ratio: number) {
  for (const o of observers) {
    if (o.disconnected) continue
    o.cb(o.targets.map((target) => ({ isIntersecting: ratio > 0, intersectionRatio: ratio, target })))
  }
}

const { useCountShownWhenVisible, useCountSeenWhileOpen } = await import('../useListingCounts')

function Card({ id, ownerId }: { id: string; ownerId: string }) {
  const ref = useCountShownWhenVisible(id, ownerId)
  return <div ref={ref} data-testid="card" />
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('IntersectionObserver', FakeIO)
  observers = []
  addMock.mockClear()
  fakeAuth = { user: null }
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useCountShownWhenVisible (Apariciones)', () => {
  it('watches for half the card being on screen', () => {
    render(<Card id="L1" ownerId="o1" />)
    expect(observers[0]?.options?.threshold).toEqual(expect.arrayContaining([0.5]))
  })

  it('counts after 1 full second at least half visible', () => {
    render(<Card id="L1" ownerId="o1" />)
    act(() => setVisible(0.6))
    act(() => { vi.advanceTimersByTime(999) })
    expect(addMock).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(addMock).toHaveBeenCalledWith('L1', 'shown')
  })

  it('scrolling past quickly counts nothing', () => {
    render(<Card id="L1" ownerId="o1" />)
    act(() => setVisible(1))
    act(() => { vi.advanceTimersByTime(600) })
    act(() => setVisible(0))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(addMock).not.toHaveBeenCalled()
  })

  it('less than half on screen counts nothing', () => {
    render(<Card id="L1" ownerId="o1" />)
    act(() => setVisible(0.4))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(addMock).not.toHaveBeenCalled()
  })

  it('a card left on screen counts once, not every second', () => {
    render(<Card id="L1" ownerId="o1" />)
    act(() => setVisible(1))
    act(() => { vi.advanceTimersByTime(10000) })
    expect(addMock).toHaveBeenCalledTimes(1)
  })

  it('a hidden browser tab counts nothing', () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    render(<Card id="L1" ownerId="o1" />)
    act(() => setVisible(1))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(addMock).not.toHaveBeenCalled()
  })

  it('the owner\'s own listing is never sent', () => {
    fakeAuth = { user: { id: 'o1' } }
    render(<Card id="L1" ownerId="o1" />)
    act(() => setVisible(1))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(addMock).not.toHaveBeenCalled()
  })

  it('a signed-in visitor who is not the owner counts', () => {
    fakeAuth = { user: { id: 'buyer' } }
    render(<Card id="L1" ownerId="o1" />)
    act(() => setVisible(1))
    act(() => { vi.advanceTimersByTime(1000) })
    expect(addMock).toHaveBeenCalledWith('L1', 'shown')
  })

  it('a card removed before its second counts nothing', () => {
    const { unmount } = render(<Card id="L1" ownerId="o1" />)
    act(() => setVisible(1))
    act(() => { vi.advanceTimersByTime(500) })
    unmount()
    act(() => { vi.advanceTimersByTime(5000) })
    expect(addMock).not.toHaveBeenCalled()
  })

  it('a browser without IntersectionObserver counts nothing and does not break', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    expect(() => render(<Card id="L1" ownerId="o1" />)).not.toThrow()
    act(() => { vi.advanceTimersByTime(5000) })
    expect(addMock).not.toHaveBeenCalled()
  })
})

describe('useCountSeenWhileOpen (Vistas)', () => {
  it('counts after the listing stays open 2 seconds', () => {
    renderHook(() => useCountSeenWhileOpen('L1', 'o1'))
    act(() => { vi.advanceTimersByTime(1999) })
    expect(addMock).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(addMock).toHaveBeenCalledWith('L1', 'seen')
  })

  it('closed before 2 seconds counts nothing', () => {
    const { unmount } = renderHook(() => useCountSeenWhileOpen('L1', 'o1'))
    act(() => { vi.advanceTimersByTime(1500) })
    unmount()
    act(() => { vi.advanceTimersByTime(5000) })
    expect(addMock).not.toHaveBeenCalled()
  })

  it('switching to another listing restarts the 2 seconds for the new one', () => {
    const { rerender } = renderHook(({ id }) => useCountSeenWhileOpen(id, 'o1'), { initialProps: { id: 'L1' } })
    act(() => { vi.advanceTimersByTime(1500) })
    rerender({ id: 'L2' })
    act(() => { vi.advanceTimersByTime(1999) })
    expect(addMock).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(1) })
    expect(addMock).toHaveBeenCalledTimes(1)
    expect(addMock).toHaveBeenCalledWith('L2', 'seen')
  })

  it('waits for the listing to load (no owner known yet)', () => {
    renderHook(() => useCountSeenWhileOpen('L1', undefined))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(addMock).not.toHaveBeenCalled()
  })

  it('the owner opening their own listing is never sent', () => {
    fakeAuth = { user: { id: 'o1' } }
    renderHook(() => useCountSeenWhileOpen('L1', 'o1'))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(addMock).not.toHaveBeenCalled()
  })

  it('a hidden tab does not count a vista', () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    renderHook(() => useCountSeenWhileOpen('L1', 'o1'))
    act(() => { vi.advanceTimersByTime(5000) })
    expect(addMock).not.toHaveBeenCalled()
  })
})
