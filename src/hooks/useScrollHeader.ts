import { useState, useEffect, useRef } from 'react'

export function useScrollHeader() {
  const [isScrolled, setIsScrolled] = useState(false)
  const heroRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolled(!entry!.isIntersecting)
      },
      { rootMargin: '0px 0px -60px 0px', threshold: 0 }
    )

    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  return { isScrolled, heroRef }
}
