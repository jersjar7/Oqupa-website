import { useState, useEffect, useCallback, useRef } from 'react'

export function useMobileMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const scrollPosRef = useRef(0)

  const close = useCallback(() => {
    setIsOpen(false)
    document.body.style.overflow = ''
    document.body.style.position = ''
    document.body.style.width = ''
    document.body.style.top = ''
    window.scrollTo(0, scrollPosRef.current)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) {
        scrollPosRef.current = window.scrollY
        document.body.style.overflow = 'hidden'
        document.body.style.position = 'fixed'
        document.body.style.width = '100%'
        document.body.style.top = `-${scrollPosRef.current}px`
      } else {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.width = ''
        document.body.style.top = ''
        window.scrollTo(0, scrollPosRef.current)
      }
      return !prev
    })
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) close()
    }

    const handleResize = () => {
      if (window.innerWidth > 768 && isOpen) close()
    }

    document.addEventListener('keydown', handleEscape)
    window.addEventListener('resize', handleResize)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen, close])

  return { isOpen, toggle, close, menuRef, toggleRef }
}
