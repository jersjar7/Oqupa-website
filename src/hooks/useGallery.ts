import { useState, useRef, useCallback } from 'react'

export function useGallery(totalSlides: number, initialSlide = 0) {
  const [currentSlide, setCurrentSlide] = useState(initialSlide)
  const trackRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)

  const next = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides)
  }, [totalSlides])

  const prev = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides)
  }, [totalSlides])

  const goTo = useCallback((index: number) => {
    setCurrentSlide(index)
  }, [])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX
  }, [])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const diff = touchStartX.current - e.changedTouches[0]!.clientX
      if (Math.abs(diff) > 50) {
        if (diff > 0) next()
        else prev()
      }
    },
    [next, prev]
  )

  return { currentSlide, next, prev, goTo, trackRef, onTouchStart, onTouchEnd }
}
