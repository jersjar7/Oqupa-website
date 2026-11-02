import type { ReactNode } from 'react'

/**
 * The choices at the bottom of a confirmation window — one rule on the
 * website and in the app (`OqupaAlertDialog`, Jerson 2026-11-02: a label
 * broke onto two lines, left-aligned, and looked misaligned):
 *
 * - Two choices sit side by side only when both labels fit on one line.
 *   Otherwise they stack full width: the action on top, the way out below.
 * - Put the way out FIRST (`<Button variant="text">Cancelar</Button>`), the
 *   action LAST. Side by side the way out is on the left; stacked
 *   (`flex-wrap-reverse` draws the first line at the bottom) it is at the
 *   bottom.
 * - Every choice is at least 48 px tall and never breaks its label: each one
 *   is at least as wide as its label on one line (`min-w-max`), so a pair that
 *   does not fit wraps to two lines of one choice each instead.
 * - The action is a brand button (bold, upper case, tracked: `Button`
 *   primary/danger); the way out is the quiet `text` variant.
 */
export default function DialogActions({
  children,
  className = 'mt-6',
}: {
  children: ReactNode
  /** Spacing above the choices; `mt-6` in a window, less inside a card. */
  className?: string
}) {
  return (
    <div
      data-dialog-actions=""
      className={`flex flex-wrap-reverse gap-3 *:min-h-12 *:min-w-max *:flex-1 *:whitespace-nowrap ${className}`}
    >
      {children}
    </div>
  )
}
