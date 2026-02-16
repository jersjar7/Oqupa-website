import { useEffect, useRef, useState } from 'react'

export function useAnimateOnScroll(options?: { threshold?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry!.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(el)
        }
      },
      {
        rootMargin: '0px 0px -100px 0px',
        threshold: options?.threshold ?? 0.1,
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [options?.threshold])

  return { ref, isVisible }
}
