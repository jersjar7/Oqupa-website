// The preview card shown over a pin on the computer-size explore map (hover,
// or pinned when a listing is selected). Moved out of the old Google
// MapPreviewCard (map plan step 4: the website's map is Mapbox now).
import PhotoCarousel from './PhotoCarousel'
import { CURRENCY_SYMBOLS, PROPERTY_TYPE_LABELS } from '@/types/enums'
import { getPriceSuffix } from '@/lib/formatters'
import SaveButton from '@/components/lists/SaveButton'
import type { ListingWithProperty } from '@/types/explore'

export function CardContent({ item }: { item: ListingWithProperty }) {
  const { listing, property } = item
  const photoRefs = property.media.photoKeys?.length
    ? property.media.photoKeys
    : property.media.propertyPhotoUrls
  const symbol = CURRENCY_SYMBOLS[listing.price.currency]
  const typeLabel = PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType
  const priceSuffix = getPriceSuffix(property.operationType, property.rentalDurationType)
  const isApproximate = listing.showExactLocation === false

  return (
    <div className="w-[280px] overflow-hidden rounded-xl bg-white shadow-large">
      {/* Photo carousel */}
      <div className="relative">
        <PhotoCarousel
          photoRefs={photoRefs}
          maxPhotos={5}
          aspectRatio="4/3"
          alt={`${typeLabel} en ${property.location.distrito}`}
          blurHash={property.media.photoBlurHashes?.[0]}
          microThumb={property.media.primaryPhotoMicroThumb}
        />
        <SaveButton listingId={listing.id} className="absolute right-2 top-2 z-10" />
        {listing.isBoosted && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white shadow">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            Destacado
          </span>
        )}
        {isApproximate && (
          <span className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
            Ubicacion aproximada
          </span>
        )}
      </div>

      {/* Info */}
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
        </div>
      </div>
    </div>
  )
}
