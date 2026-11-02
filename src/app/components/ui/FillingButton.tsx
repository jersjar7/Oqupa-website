import { useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from 'react'
import { useFillProgress, prefersReducedMotion, FILL_COMPLETE_MS, type FillStatus } from '@/hooks/useFillProgress'

export type { FillStatus } from '@/hooks/useFillProgress'

interface FillingButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** idle → filling → done, or filling → error (then it is a retry button). */
  status: FillStatus
  /** The work's real progress on the bar's scale, 0..1 (see lib/fillProgress). */
  progress?: number
  /** The label at rest, e.g. "Publicar". */
  children: ReactNode
  fillingLabel?: string
  doneLabel?: string
  retryLabel?: string
  /** Screen-reader announcements, said once each. */
  fillingAnnouncement?: string
  doneAnnouncement?: string
  errorAnnouncement?: string
  /** Called once the full bar has shown its done label. */
  onDone?: () => void
  /**
   * At rest (and as REINTENTAR) a filled green button instead of an outlined
   * one — for a page's single main action, beside an outlined ATRÁS.
   */
  solid?: boolean
}

/**
 * A button that becomes its own progress bar (ADR-043, D14) — the shared
 * component for any long action (publishing first).
 *
 * At rest it is the primary button. Tapped, it turns into a bar of the same
 * shape: pale green that fills with brand green. The fill follows a time curve
 * and the real progress, waits at 90% until the work is confirmed, never goes
 * backwards and never shows a number. It cannot be tapped while filling. When
 * the work is confirmed it fills, says the done label with a check, then
 * calls `onDone`. On error it goes back to a button that says REINTENTAR.
 *
 * The label is white where the bar is filled and green where it is not, so it
 * reads at every point of the fill (white on the pale part would not).
 */
export default function FillingButton({
  status,
  progress = 0,
  children,
  fillingLabel = 'PUBLICANDO…',
  doneLabel = '¡PUBLICADO!',
  retryLabel = 'REINTENTAR',
  fillingAnnouncement = 'Publicando',
  doneAnnouncement = 'Publicado',
  errorAnnouncement = 'No pudimos publicar',
  onDone,
  solid = false,
  className = '',
  disabled,
  onClick,
  type = 'button',
  ...props
}: FillingButtonProps) {
  const [reducedMotion] = useState(prefersReducedMotion)
  const { fill, showDone } = useFillProgress(status, progress, { reducedMotion, onDone })
  const busy = status === 'filling' || status === 'done'

  const base =
    'relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full border-[1.5px] px-6 font-sans text-base font-bold uppercase tracking-[1px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2'

  const off = !busy && disabled
  const look = busy
    ? 'cursor-default border-secondary bg-secondary-pale text-secondary'
    : off
      ? 'pointer-events-none border-border text-text-tertiary'
      : solid
        ? 'border-secondary bg-secondary text-white hover:border-secondary-hover hover:bg-secondary-hover active:scale-[0.97]'
        : 'border-secondary text-secondary hover:border-secondary-hover hover:text-secondary-hover active:scale-[0.97]'

  const label = showDone ? (
    <>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={3}>
        <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{doneLabel}</span>
    </>
  ) : (
    <span>{busy ? fillingLabel : status === 'error' ? retryLabel : children}</span>
  )

  const pct = `${(fill * 100).toFixed(2)}%`
  const transition = reducedMotion
    ? 'none'
    : status === 'done'
      ? `width ${FILL_COMPLETE_MS}ms ease-out, clip-path ${FILL_COMPLETE_MS}ms ease-out`
      : 'width 120ms linear, clip-path 120ms linear'

  return (
    <>
      <button
        type={type}
        // One element throughout, and NOT natively disabled while filling:
        // a disabled button drops keyboard focus to the page. aria-disabled
        // tells assistive tech; the click guard stops the action (and, for a
        // submit button, the form submit — Enter in a field clicks it too).
        disabled={off}
        aria-disabled={busy || off ? 'true' : undefined}
        data-status={status}
        data-fill={busy ? fill.toFixed(4) : undefined}
        onClick={(e: MouseEvent<HTMLButtonElement>) => {
          if (busy) {
            e.preventDefault()
            return
          }
          onClick?.(e)
        }}
        className={`${base} ${look} ${className}`}
        {...props}
      >
        {busy && (
          <span
            aria-hidden="true"
            data-testid="filling-bar"
            className="absolute inset-y-0 left-0 bg-secondary"
            style={{ width: pct, transition }}
          />
        )}
        <span className="relative inline-flex items-center gap-2">{label}</span>
        {busy && (
          <span
            aria-hidden="true"
            className="absolute inset-0 inline-flex items-center justify-center gap-2 text-white"
            style={{ clipPath: `inset(0 calc(100% - ${pct}) 0 0)`, transition }}
          >
            {label}
          </span>
        )}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {status === 'filling' || (status === 'done' && !showDone)
          ? fillingAnnouncement
          : showDone
            ? doneAnnouncement
            : status === 'error'
              ? errorAnnouncement
              : ''}
      </span>
    </>
  )
}
