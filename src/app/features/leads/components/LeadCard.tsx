import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button } from '@/app/components/ui'
import { blurHashToDataUrl } from '@/lib/blurhash'
import { getPriceSuffix } from '@/lib/formatters'
import { useGallery } from '@/hooks/useGallery'
import GalleryModal from '@/app/components/GalleryModal'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import {
  PROPERTY_TYPE_LABELS,
  CURRENCY_SYMBOLS,
} from '@/types/enums'

interface LeadCardProps {
  listing: Listing
  property: Property
  canClaim: boolean
  onClaim: () => void
  isClaiming: boolean
}

function formatPrice(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency
  return `${symbol} ${amount.toLocaleString('es-PE')}`
}

export default function LeadCard({ listing, property, canClaim, onClaim, isClaiming }: LeadCardProps) {
  const photos = property.media.propertyPhotoUrls.length > 0
    ? property.media.propertyPhotoUrls
    : property.media.thumbnailPhotoUrls ?? []
  const blurHash = property.media.photoBlurHashes?.[0]
  const microThumb = property.media.primaryPhotoMicroThumb
  const blurDataUrl = useMemo(() => blurHashToDataUrl(blurHash), [blurHash])
  const placeholderUrl = microThumb
    ? `data:image/webp;base64,${microThumb}`
    : blurDataUrl
  const slotsFull = listing.currentClaimsCount >= listing.maxRealtors

  const carousel = useGallery(photos.length)
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-light transition-shadow hover:shadow-medium">
      {/* Photo carousel */}
      <div
        className="group relative h-44 bg-gray-100"
        style={placeholderUrl ? { backgroundImage: `url(${placeholderUrl})`, backgroundSize: 'cover' } : undefined}
      >
        {photos.length > 0 ? (
          <>
            <div
              ref={carousel.trackRef}
              className="flex h-full transition-transform duration-300 ease-in-out"
              style={{ transform: `translateX(-${carousel.currentSlide * 100}%)` }}
              onTouchStart={carousel.onTouchStart}
              onTouchEnd={carousel.onTouchEnd}
            >
              {photos.map((url, i) => (
                <div
                  key={i}
                  className="h-full w-full shrink-0 cursor-pointer"
                  onClick={() => { setModalOpen(true) }}
                >
                  <img
                    src={url}
                    alt={`Foto ${i + 1}`}
                    className="h-full w-full object-cover"
                    loading={i === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                  />
                </div>
              ))}
            </div>

            {/* Photo count badge */}
            {photos.length > 1 && (
              <div className="absolute top-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white">
                {carousel.currentSlide + 1}/{photos.length}
              </div>
            )}

            {/* Prev/Next buttons (visible on hover) */}
            {photos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); carousel.prev() }}
                  className="absolute top-1/2 left-2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Imagen anterior"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); carousel.next() }}
                  className="absolute top-1/2 right-2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label="Siguiente imagen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Dot indicators */}
            {photos.length > 1 && photos.length <= 6 && (
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                {photos.map((_, i) => (
                  <span
                    key={i}
                    className={`block h-1.5 w-1.5 rounded-full transition-colors ${
                      i === carousel.currentSlide ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-text-tertiary">
            Sin imagen
          </div>
        )}

        {listing.isBoosted && (
          <Badge variant="warning" className="absolute top-3 left-3">
            Destacado
          </Badge>
        )}
      </div>

      {/* Content area — links to detail page */}
      <Link to={`/app/leads/${listing.id}`} className="block p-4 hover:bg-gray-50 transition-colors">
        {/* Price */}
        <p className="text-lg font-bold text-primary">
          {formatPrice(listing.price.amount, listing.price.currency)}
          {(() => {
            const suffix = getPriceSuffix(property.operationType, property.rentalDurationType)
            return suffix ? <span className="text-sm font-normal text-text-secondary"> {suffix}</span> : null
          })()}
        </p>

        {/* Property type + location */}
        <div className="mt-1 flex items-center gap-2">
          <span className="text-sm font-medium text-text-secondary">
            {PROPERTY_TYPE_LABELS[property.propertyType]}
          </span>
          <span className="text-text-tertiary">·</span>
          <span className="text-sm text-text-secondary">
            {property.location.distrito}
          </span>
        </div>

        {/* Specs */}
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-secondary">
          {property.specs.bedroomCount != null && (
            <span>{property.specs.bedroomCount} hab.</span>
          )}
          {property.specs.bathroomCount != null && (
            <span>{property.specs.bathroomCount} baño{property.specs.bathroomCount !== 1 ? 's' : ''}</span>
          )}
          {property.specs.totalAreaInSquareMeters > 0 && (
            <span>{property.specs.totalAreaInSquareMeters} m²</span>
          )}
        </div>

        {/* Claims slot indicator */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-text-tertiary">
            {listing.currentClaimsCount}/{listing.maxRealtors} agentes
          </span>
          {slotsFull && (
            <Badge variant="default">Completo</Badge>
          )}
        </div>
      </Link>

      {/* Claim button (separate from link area) */}
      <div className="px-4 pb-4">
        <Button
          className="w-full"
          disabled={!canClaim || slotsFull}
          isLoading={isClaiming}
          onClick={(e) => { e.stopPropagation(); onClaim() }}
        >
          Reclamar
        </Button>
      </div>

      {/* Gallery modal */}
      {modalOpen && (
        <GalleryModal
          images={photos}
          startIndex={carousel.currentSlide}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
