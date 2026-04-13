import { useEffect, useState, useCallback, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronUp } from 'lucide-react'

interface SignHereMarkerProps {
  text: string
  visible: boolean
  anchorRef: RefObject<HTMLDivElement | null>
}

function useIsXl() {
  const [matches, setMatches] = useState(() => window.matchMedia('(min-width: 1280px)').matches)
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1280px)')
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    setMatches(mql.matches)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return matches
}

export default function SignHereMarker({ text, visible, anchorRef }: SignHereMarkerProps) {
  const isXl = useIsXl()
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const updatePos = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect()
    if (!rect) return
    setPos({
      top: rect.top + rect.height / 2,
      left: rect.right + 16,
    })
  }, [anchorRef])

  useEffect(() => {
    if (!visible || !isXl) return
    updatePos()
    window.addEventListener('scroll', updatePos, { passive: true })
    window.addEventListener('resize', updatePos, { passive: true })
    return () => {
      window.removeEventListener('scroll', updatePos)
      window.removeEventListener('resize', updatePos)
    }
  }, [visible, isXl, updatePos])

  const markerContent = (
    <span className="whitespace-pre-line rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary">
      {text}
    </span>
  )

  return (
    <>
      {/* Mobile / tablet (< xl): inline below field */}
      {!isXl && (
        <AnimatePresence>
          {visible && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="pointer-events-none mt-2 flex items-center gap-1.5"
            >
              <ChevronUp className="h-4 w-4 shrink-0 text-primary" />
              {markerContent}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Desktop (xl+): portal to body, position: fixed */}
      {isXl && createPortal(
        <AnimatePresence>
          {visible && pos && (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="pointer-events-none fixed z-50 flex max-w-[260px] items-center gap-1.5"
              style={{ top: pos.top, left: pos.left, transform: 'translateY(-50%)' }}
            >
              <ChevronLeft className="h-4 w-4 shrink-0 text-primary" />
              {markerContent}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
