import { useEffect } from 'react'
import { useGallery } from '@/hooks/useGallery'
import { useFocusTrap } from '@/hooks/useFocusTrap'

interface GalleryModalProps {
  images: string[]
  startIndex: number
  onClose: () => void
}

export default function GalleryModal({ images, startIndex, onClose }: GalleryModalProps) {
  const { currentSlide, next, prev, trackRef, onTouchStart, onTouchEnd } =
    useGallery(images.length, startIndex)
  const containerRef = useFocusTrap<HTMLDivElement>(true)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Galería de fotos"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black outline-none"
    >
      {/* Counter badge */}
      <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-10 rounded-full bg-black/60 px-3 py-1 text-sm font-medium text-white">
        {currentSlide + 1} / {images.length}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
        aria-label="Cerrar galería"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Gallery track */}
      <div
        ref={trackRef}
        className="flex h-full w-full transition-transform duration-300 ease-in-out"
        style={{ transform: `translateX(-${currentSlide * 100}%)` }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {images.map((url, i) => (
          <div key={i} className="flex h-full w-full shrink-0 items-center justify-center p-4">
            <img
              src={url}
              alt={`Foto ${i + 1}`}
              className="max-h-full max-w-full object-contain"
              loading={Math.abs(i - startIndex) <= 1 ? 'eager' : 'lazy'}
              decoding="async"
            />
          </div>
        ))}
      </div>

      {/* Prev button */}
      {images.length > 1 && (
        <button
          onClick={prev}
          className="absolute top-1/2 left-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          aria-label="Imagen anterior"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Next button */}
      {images.length > 1 && (
        <button
          onClick={next}
          className="absolute top-1/2 right-3 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
          aria-label="Siguiente imagen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
