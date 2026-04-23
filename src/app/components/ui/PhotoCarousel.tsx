/**
 * PhotoCarousel — simple image carousel used by all property cards on
 * Mis Propiedades (Propias, Reclamadas, Asignadas).
 *
 * Behavior:
 *   - Shows a single photo at a time using the R2 CDN via `cardUrl`.
 *   - Prev/Next arrows appear on hover over the container (and always on
 *     touch devices via the `group-hover` fallback being replaced with
 *     always-visible at narrow widths — see className).
 *   - Dot indicator at the bottom when there are 2+ photos.
 *   - Keyboard left/right arrows cycle when the carousel is focused.
 *   - 0 photos → "Sin imagen" placeholder.
 *   - 1 photo  → no controls.
 *   - Uses the first blurhash/microThumb as a background placeholder for
 *     perceived-perf during image load.
 */
import { useCallback, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { blurHashToDataUrl } from '@/lib/blurhash'
import { card as cardUrl } from '@/lib/imageUrl'

export interface PhotoCarouselProps {
  /** Ordered list of photo refs (R2 keys or legacy full URLs). */
  photos: string[]
  /** Optional per-photo blurhashes (same length as `photos` is ideal). */
  blurHashes?: string[]
  /** Base64-encoded micro thumbnail of the first photo; used as placeholder. */
  microThumb?: string
  /** Alt text used for every slide — parent supplies a meaningful description. */
  alt: string
  /** Extra classes on the outer container (parent controls height). */
  className?: string
  /**
   * Called when the user navigates — optional, for analytics/telemetry.
   * Not guaranteed stable across renders (no `useCallback` on the carousel
   * side). Consumers wrapping the carousel in `React.memo` should memoize
   * their callback on their end.
   */
  onSlideChange?: (index: number) => void
}

export default function PhotoCarousel({
  photos, blurHashes, microThumb, alt, className = '', onSlideChange,
}: PhotoCarouselProps) {
  const [index, setIndex] = useState(0)

  const count = photos.length
  const primaryBlurDataUrl = useMemo(() => blurHashToDataUrl(blurHashes?.[0]), [blurHashes])
  const placeholderUrl = microThumb
    ? `data:image/webp;base64,${microThumb}`
    : primaryBlurDataUrl

  const go = useCallback((next: number) => {
    if (count === 0) return
    const bounded = ((next % count) + count) % count
    setIndex(bounded)
    onSlideChange?.(bounded)
  }, [count, onSlideChange])

  const goPrev = useCallback((e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    go(index - 1)
  }, [go, index])

  const goNext = useCallback((e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    go(index + 1)
  }, [go, index])

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goPrev(e)
    else if (e.key === 'ArrowRight') goNext(e)
  }, [goPrev, goNext])

  if (count === 0) {
    return (
      <div
        className={`group relative flex items-center justify-center bg-gray-100 text-text-tertiary ${className}`}
        role="img"
        aria-label={alt}
      >
        Sin imagen
      </div>
    )
  }

  const currentRef = photos[index]!
  const currentUrl = cardUrl(currentRef)

  return (
    <div
      className={`group relative overflow-hidden bg-gray-100 ${className}`}
      style={placeholderUrl ? { backgroundImage: `url(${placeholderUrl})`, backgroundSize: 'cover' } : undefined}
      tabIndex={count > 1 ? 0 : undefined}
      onKeyDown={count > 1 ? onKey : undefined}
      role={count > 1 ? 'region' : undefined}
      aria-label={count > 1 ? `${alt} — carrusel de ${count} fotos` : undefined}
    >
      <img
        key={index}
        src={currentUrl}
        alt={`${alt} · foto ${index + 1} de ${count}`}
        className="h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={goPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
          >
            <ChevronLeft className="h-4 w-4 text-text-primary" />
          </button>
          <button
            type="button"
            aria-label="Foto siguiente"
            onClick={goNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
          >
            <ChevronRight className="h-4 w-4 text-text-primary" />
          </button>

          {/* Dot indicator */}
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Exported so tests can compute the next-index directly without React.
export function computeNextIndex(current: number, delta: number, count: number): number {
  if (count === 0) return 0
  return (((current + delta) % count) + count) % count
}
