import { useEffect, useRef, useState } from 'react'
import { nextFill } from '@/lib/fillProgress'

export type FillStatus = 'idle' | 'filling' | 'done' | 'error'

/** Last stretch to a full bar, once the work is confirmed. */
export const FILL_COMPLETE_MS = 300
/** How long the full bar shows its "done" label before moving on. */
export const FILL_CELEBRATE_MS = 600
const TICK_MS = 50

export interface FillProgress {
  /** 0..1, what the bar shows. */
  fill: number
  /** True once the bar is full and the "done" label should show. */
  showDone: boolean
}

/**
 * Drives a filling button (ADR-043, D14). While `status` is 'filling' the bar
 * follows max(time curve, `progress`), capped at 0.90 and never backwards.
 * On 'done' it goes to full in FILL_COMPLETE_MS, shows the done label for
 * FILL_CELEBRATE_MS, then calls `onDone`. With reduced motion the bar jumps
 * to full at once (the label still shows, so the person sees it worked).
 */
export function useFillProgress(
  status: FillStatus,
  progress: number,
  { reducedMotion = false, onDone }: { reducedMotion?: boolean; onDone?: () => void } = {},
): FillProgress {
  const [fill, setFill] = useState(0)
  const [showDone, setShowDone] = useState(false)
  const progressRef = useRef(progress)
  progressRef.current = progress
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    if (status !== 'filling') return
    const start = Date.now()
    setFill(0)
    setShowDone(false)
    const tick = () => setFill((prev) => nextFill(prev, Date.now() - start, progressRef.current))
    tick()
    const id = setInterval(tick, TICK_MS)
    return () => clearInterval(id)
  }, [status])

  // Real progress can jump ahead between ticks; show it straight away.
  useEffect(() => {
    if (status === 'filling') setFill((prev) => nextFill(prev, 0, progress))
  }, [status, progress])

  useEffect(() => {
    if (status === 'done') {
      setFill(1)
      const toLabel = reducedMotion ? 0 : FILL_COMPLETE_MS
      const t1 = setTimeout(() => setShowDone(true), toLabel)
      const t2 = setTimeout(() => onDoneRef.current?.(), toLabel + FILL_CELEBRATE_MS)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
    if (status === 'idle' || status === 'error') {
      setFill(0)
      setShowDone(false)
    }
  }, [status, reducedMotion])

  return { fill, showDone }
}

/** True when the person asked the system for less motion. */
export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}
