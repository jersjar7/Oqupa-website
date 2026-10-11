// @vitest-environment jsdom

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useGallery } from '@/hooks/useGallery'

describe('useGallery', () => {
  it('currentSlide starts at 0 by default', () => {
    const { result } = renderHook(() => useGallery(5))
    expect(result.current.currentSlide).toBe(0)
  })

  it('currentSlide starts at the given initialSlide', () => {
    const { result } = renderHook(() => useGallery(5, 3))
    expect(result.current.currentSlide).toBe(3)
  })

  it('next() advances to the next slide', () => {
    const { result } = renderHook(() => useGallery(5))
    act(() => result.current.next())
    expect(result.current.currentSlide).toBe(1)
  })

  it('next() wraps back to 0 from the last slide', () => {
    const { result } = renderHook(() => useGallery(3, 2))
    act(() => result.current.next())
    expect(result.current.currentSlide).toBe(0)
  })

  it('prev() goes back to the previous slide', () => {
    const { result } = renderHook(() => useGallery(5, 3))
    act(() => result.current.prev())
    expect(result.current.currentSlide).toBe(2)
  })

  it('prev() wraps from slide 0 to the last slide', () => {
    const { result } = renderHook(() => useGallery(5))
    act(() => result.current.prev())
    expect(result.current.currentSlide).toBe(4)
  })

  it('goTo() jumps directly to the given index', () => {
    const { result } = renderHook(() => useGallery(5))
    act(() => result.current.goTo(4))
    expect(result.current.currentSlide).toBe(4)
  })

  it('onTouchEnd calls prev() when swiping right more than 50px', () => {
    const { result } = renderHook(() => useGallery(5, 2))
    act(() => {
      result.current.onTouchStart({ touches: [{ clientX: 100 }] } as unknown as React.TouchEvent)
      result.current.onTouchEnd({ changedTouches: [{ clientX: 200 }] } as unknown as React.TouchEvent)
    })
    expect(result.current.currentSlide).toBe(1)
  })

  it('onTouchEnd calls next() when swiping left more than 50px', () => {
    const { result } = renderHook(() => useGallery(5))
    act(() => {
      result.current.onTouchStart({ touches: [{ clientX: 200 }] } as unknown as React.TouchEvent)
      result.current.onTouchEnd({ changedTouches: [{ clientX: 100 }] } as unknown as React.TouchEvent)
    })
    expect(result.current.currentSlide).toBe(1)
  })

  it('onTouchEnd does nothing when the swipe is less than 50px', () => {
    const { result } = renderHook(() => useGallery(5, 2))
    act(() => {
      result.current.onTouchStart({ touches: [{ clientX: 200 }] } as unknown as React.TouchEvent)
      result.current.onTouchEnd({ changedTouches: [{ clientX: 180 }] } as unknown as React.TouchEvent)
    })
    expect(result.current.currentSlide).toBe(2)
  })
})
