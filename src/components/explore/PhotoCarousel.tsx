import { useMemo } from 'react'
import { AnimatedImage } from '@/app/components/ui'
import { useGallery } from '@/hooks/useGallery'
import { card as cardUrl } from '@/lib/imageUrl'
import { blurHashToDataUrl } from '@/lib/blurhash'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PhotoCarouselProps {
  photoRefs: string[]
  maxPhotos?: number
  aspectRatio?: string
  showArrowsAlways?: boolean
  onPhotoClick?: () => void
  blurHash?: string
  microThumb?: string
  /** Description used to build each slide's alt text (e.g. "Casa en Piura"). */
  alt?: string
}

export default function PhotoCarousel({
  photoRefs,
  maxPhotos = 5,
  aspectRatio = '4/3',
  showArrowsAlways = false,
  onPhotoClick,
  blurHash,
  microThumb,
  alt = 'Propiedad',
}: PhotoCarouselProps) {
  const photos = photoRefs.slice(0, maxPhotos)
  const count = photos.length
  const { currentSlide, next, prev, goTo, onTouchStart, onTouchEnd } = useGallery(count)

  const blurDataUrl = useMemo(() => blurHashToDataUrl(blurHash), [blurHash])
  const placeholderUrl = microThumb
    ? `data:image/webp;base64,${microThumb}`
    : blurDataUrl

  if (count === 0) {
    return (
      <div
        className="flex items-center justify-center bg-background-secondary text-text-tertiary"
        style={{ aspectRatio }}
      >
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
        </svg>
      </div>
    )
  }

  return (
    <div
      className="group relative overflow-hidden bg-background-secondary"
      style={{ aspectRatio }}
      onClick={onPhotoClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slide track */}
      <div
        className="flex h-full transition-transform duration-250 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
      >
        {photos.map((ref, i) => {
          const src = cardUrl(ref)
          return (
            <div
              key={ref}
              className="h-full w-full shrink-0"
              style={
                i === 0 && placeholderUrl
                  ? { backgroundImage: `url(${placeholderUrl})`, backgroundSize: 'cover' }
                  : undefined
              }
            >
              {i === 0 ? (
                <AnimatedImage
                  src={src}
                  alt={`${alt} · foto ${i + 1} de ${count}`}
                  className="h-full w-full object-cover"
                  loading="eager"
                />
              ) : (
                <img
                  src={src}
                  alt={`${alt} · foto ${i + 1} de ${count}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Arrow buttons */}
      {count > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev() }}
            className={`absolute left-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-text-primary shadow-sm transition-opacity ${
              showArrowsAlways ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } ${currentSlide === 0 ? 'invisible' : ''}`}
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next() }}
            className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-text-primary shadow-sm transition-opacity ${
              showArrowsAlways ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            } ${currentSlide === count - 1 ? 'invisible' : ''}`}
            aria-label="Next photo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {count > 1 && (
        <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); goTo(i) }}
              className={`h-1.5 w-1.5 rounded-full transition-all ${
                i === currentSlide ? 'bg-white scale-110' : 'bg-white/50'
              }`}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
