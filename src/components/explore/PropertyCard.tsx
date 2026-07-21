import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AnimatedImage } from '@/app/components/ui'
import { CURRENCY_SYMBOLS, PROPERTY_TYPE_LABELS } from '@/types/enums'
import { getPriceSuffix } from '@/lib/formatters'
import { blurHashToDataUrl } from '@/lib/blurhash'
import { card as cardUrl } from '@/lib/imageUrl'
import SaveButton from '@/components/lists/SaveButton'
import type { ListingWithProperty } from '@/types/explore'

interface PropertyCardProps {
  item: ListingWithProperty
  isHighlighted?: boolean
}

export default function PropertyCard({ item, isHighlighted = false }: PropertyCardProps) {
  const { listing, property } = item
  const photoRef = property.media.photoKeys?.[0] ?? property.media.propertyPhotoUrls[0]
  const thumbnail = photoRef ? cardUrl(photoRef) : undefined
  const microThumb = property.media.primaryPhotoMicroThumb
  const blurHash = property.media.photoBlurHashes?.[0]
  const blurDataUrl = useMemo(() => blurHashToDataUrl(blurHash), [blurHash])
  const placeholderUrl = microThumb
    ? `data:image/webp;base64,${microThumb}`
    : blurDataUrl
  const symbol = CURRENCY_SYMBOLS[listing.price.currency]
  const typeLabel = PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType
  const priceSuffix = getPriceSuffix(property.operationType, property.rentalDurationType)

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-medium ${
        isHighlighted ? 'border-primary ring-2 ring-primary/20' : 'border-border'
      }`}
    >
      <Link to={`/property/${listing.id}`} className="block">
        {/* Thumbnail */}
        <div
          className="group relative aspect-[4/3] w-full overflow-hidden bg-background-secondary"
          style={placeholderUrl ? { backgroundImage: `url(${placeholderUrl})`, backgroundSize: 'cover' } : undefined}
        >
          {thumbnail ? (
            <AnimatedImage
              src={thumbnail}
              alt={typeLabel}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-text-tertiary">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
            </div>
          )}
          {listing.isBoosted && (
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white shadow">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              Destacado
            </span>
          )}
        </div>

        {/* Details */}
        <div className="p-3">
          <p className="text-base font-bold text-text-primary">
            {symbol} {listing.price.amount.toLocaleString()}
            {priceSuffix && (
              <span className="text-xs font-medium text-primary"> {priceSuffix}</span>
            )}
          </p>
          <p className="mt-0.5 text-xs font-medium text-text-secondary">
            {typeLabel} &middot; {property.location.distrito}
          </p>
          <div className="mt-1 flex items-center gap-2 text-xs text-text-tertiary">
            {property.specs.bedroomCount != null && (
              <span>{property.specs.bedroomCount} hab.</span>
            )}
            {property.specs.bathroomCount != null && (
              <span>{property.specs.bathroomCount} baños</span>
            )}
            {property.specs.totalAreaInSquareMeters > 0 && (
              <span>{property.specs.totalAreaInSquareMeters} m²</span>
            )}
            <span className="ml-auto text-xs font-medium text-primary">
              Ver &rarr;
            </span>
          </div>
        </div>
      </Link>

      {/* SaveButton outside the Link and the overflow-hidden photo div */}
      <SaveButton listingId={listing.id} className="absolute right-2 top-2 z-10" />
    </div>
  )
}
