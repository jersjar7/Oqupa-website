import { useRef, useEffect, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import SignHereMarker from './SignHereMarker'

interface RevealFieldProps {
  visible: boolean
  animate: boolean
  tooltip?: string
  delay?: number
  children: ReactNode
}

export default function RevealField({
  visible,
  animate,
  tooltip,
  delay = 0,
  children,
}: RevealFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const hasScrolled = useRef(false)
  const [showMarker, setShowMarker] = useState(false)
  const markerTimer = useRef<ReturnType<typeof setTimeout>>(null)

  // Smooth-scroll into view on first animated reveal
  useEffect(() => {
    if (visible && animate && !hasScrolled.current) {
      hasScrolled.current = true
      // Wait for entrance animation to begin before scrolling
      const timeout = setTimeout(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }, (delay * 1000) + 100)
      return () => clearTimeout(timeout)
    }
  }, [visible, animate, delay])

  // Show sign-here marker 1s after animated reveal
  useEffect(() => {
    if (visible && animate && tooltip && !showMarker) {
      markerTimer.current = setTimeout(() => setShowMarker(true), (delay * 1000) + 1000)
      return () => { if (markerTimer.current) clearTimeout(markerTimer.current) }
    }
  }, [visible, animate, tooltip, delay, showMarker])

  if (!visible) return null

  const dismissMarker = () => {
    if (showMarker) setShowMarker(false)
    if (markerTimer.current) {
      clearTimeout(markerTimer.current)
      markerTimer.current = null
    }
  }

  const content = (
    <div
      ref={containerRef}
      onClickCapture={tooltip ? dismissMarker : undefined}
      onFocusCapture={tooltip ? dismissMarker : undefined}
    >
      {children}
      {tooltip && (
        <SignHereMarker text={tooltip} visible={showMarker} anchorRef={containerRef} />
      )}
    </div>
  )

  if (!animate) return content

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
    >
      {content}
    </motion.div>
  )
}
