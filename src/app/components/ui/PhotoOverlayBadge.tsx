/**
 * PhotoOverlayBadge — the status pill over a property card's photo.
 *
 * One look with the app's ListingStatusBadge (feature audit 2026-11-02; brand
 * audit C5): a white pill, a 6 px dot and a Gotham Medium uppercase label,
 * 10.5 px. Ink label when live; a neutral (closed) status — Desactivado,
 * Vendido, Alquilado — reads grey, label and dot, because none of them is an
 * error. The website used to draw a black 60 % pill with white text, which
 * made the same badge look like a different component on each platform.
 */
import type { HTMLAttributes } from 'react'

export type PhotoOverlayTone = 'neutral' | 'success' | 'warning' | 'info' | 'error'

interface PhotoOverlayBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Optional colored dot before the label. Omit for pure neutral overlay. */
  tone?: PhotoOverlayTone
}

const dotColor: Record<PhotoOverlayTone, string> = {
  neutral: 'bg-text-tertiary',
  success: 'bg-success',
  warning: 'bg-accent',
  info:    'bg-primary',
  error:   'bg-error',
}

export default function PhotoOverlayBadge({
  tone, className = '', children, ...props
}: PhotoOverlayBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-[5px] rounded-full bg-white/90 px-2 py-[3px]',
        'font-sans text-[10.5px] font-medium uppercase tracking-[0.5px]',
        tone === 'neutral' ? 'text-text-tertiary' : 'text-text-primary',
        'shadow-sm',
        className,
      ].join(' ')}
      {...props}
    >
      {tone && <span className={`h-1.5 w-1.5 rounded-full ${dotColor[tone]}`} />}
      {children}
    </span>
  )
}
