import { Link } from 'react-router-dom'
import { InfoWindow } from '@vis.gl/react-google-maps'
import { CURRENCY_SYMBOLS, PROPERTY_TYPE_LABELS } from '@/types/enums'
import { getPriceSuffix } from '@/lib/formatters'
import { card as cardUrl } from '@/lib/imageUrl'
import type { ListingWithProperty } from '@/types/explore'

interface PropertyInfoCardProps {
  item: ListingWithProperty
  onClose: () => void
}

export default function PropertyInfoCard({ item, onClose }: PropertyInfoCardProps) {
  const { listing, property } = item
  const photoRef = property.media.photoKeys?.[0] ?? property.media.propertyPhotoUrls[0]
  const thumbnail = photoRef ? cardUrl(photoRef) : undefined
  const symbol = CURRENCY_SYMBOLS[listing.price.currency]
  const typeLabel = PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType
  const priceSuffix = getPriceSuffix(property.operationType, property.rentalDurationType)

  return (
    <InfoWindow
      position={{
        lat: property.location.latitude,
        lng: property.location.longitude,
      }}
      onCloseClick={onClose}
      pixelOffset={[0, -35]}
    >
      <div className="w-56">
        {thumbnail && (
          <img
            src={thumbnail}
            alt={typeLabel}
            className="h-32 w-full rounded-t-lg object-cover"
          />
        )}
        <div className="p-3">
          <p className="text-base font-bold text-text-primary">
            {symbol} {listing.price.amount.toLocaleString()}
            {priceSuffix && (
              <span className="text-xs font-normal text-text-secondary"> {priceSuffix}</span>
            )}
          </p>
          <p className="mt-0.5 text-xs font-medium text-text-secondary">
            {typeLabel} &middot; {property.location.distrito}
          </p>
          <div className="mt-1 flex gap-2 text-xs text-text-tertiary">
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
          <Link
            to={`/property/${listing.id}`}
            className="mt-2 block text-center text-sm font-bold text-primary hover:text-primary-hover"
          >
            Ver detalles
          </Link>
        </div>
      </div>
    </InfoWindow>
  )
}
