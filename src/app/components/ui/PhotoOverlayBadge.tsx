/**
 * PhotoOverlayBadge — pill used over property card photos.
 *
 * Because the photo background varies wildly (bright sky, dark interior,
 * busy street), the badge uses a consistent black semi-transparent surface
 * with white text + backdrop-blur so it stays legible everywhere. An
 * optional colored dot keeps state meaning (green = success, amber =
 * warning, etc.) without sacrificing contrast.
 */
import type { HTMLAttributes } from 'react'

export type PhotoOverlayTone = 'neutral' | 'success' | 'warning' | 'info' | 'error'

interface PhotoOverlayBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Optional colored dot before the label. Omit for pure neutral overlay. */
  tone?: PhotoOverlayTone
}

const dotColor: Record<PhotoOverlayTone, string> = {
  neutral: 'bg-white/60',
  success: 'bg-success',
  warning: 'bg-amber-400',
  info:    'bg-primary',
  error:   'bg-error',
}

export default function PhotoOverlayBadge({
  tone, className = '', children, ...props
}: PhotoOverlayBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1',
        'font-sans text-[10px] font-bold uppercase tracking-wider text-white',
        'backdrop-blur-sm shadow-sm',
        className,
      ].join(' ')}
      {...props}
    >
      {tone && <span className={`h-2 w-2 rounded-full ring-1 ring-white/70 ${dotColor[tone]}`} />}
      {children}
    </span>
  )
}
