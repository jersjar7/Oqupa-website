/**
 * DestacadoBadge — the one look for a boosted listing, everywhere.
 *
 * Shared spec with the app (brand audit C6, 2026-10-31): ink text on the
 * boost amber (the same gold as boosted map pins), Gotham Bold, uppercase
 * "DESTACADO". Ink on amber is 6.9:1; the white-on-amber (2.15:1) and
 * pale-amber chip (2.84:1) versions it replaces failed contrast.
 */
import type { HTMLAttributes } from 'react'

interface DestacadoBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** 'sm' for the slim map card, 'md' everywhere else. */
  size?: 'sm' | 'md'
  /** Small star before the word. */
  withStar?: boolean
}

const sizeStyles = {
  sm: 'gap-0.5 rounded px-1.5 py-px text-[10px]',
  md: 'gap-1 rounded-md px-2 py-1 text-[11px]',
} as const

export default function DestacadoBadge({
  size = 'md',
  withStar = false,
  className = '',
  ...props
}: DestacadoBadgeProps) {
  return (
    <span
      className={`inline-flex items-center bg-boost font-sans font-bold uppercase tracking-wide text-ink ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {withStar && (
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )}
      DESTACADO
    </span>
  )
}
