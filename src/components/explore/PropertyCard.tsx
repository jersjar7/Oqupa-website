import { Link } from 'react-router-dom'
import { CURRENCY_SYMBOLS, PROPERTY_TYPE_LABELS } from '@/types/enums'
import { getPriceSuffix } from '@/lib/formatters'
import type { ListingWithProperty } from '@/types/explore'

interface PropertyCardProps {
  item: ListingWithProperty
  isSelected: boolean
  onClick: () => void
}

export default function PropertyCard({ item, isSelected, onClick }: PropertyCardProps) {
  const { listing, property } = item
  const thumbnail = property.media.propertyPhotoUrls[0]
  const symbol = CURRENCY_SYMBOLS[listing.price.currency]
  const typeLabel = PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType
  const priceSuffix = getPriceSuffix(property.operationType, property.rentalDurationType)

  return (
    <Link
      to={`/property/${listing.id}`}
      onClick={(e) => {
        // If clicking the card body (not navigating), highlight it
        if (e.metaKey || e.ctrlKey) return
        e.preventDefault()
        onClick()
      }}
      className={`block overflow-hidden rounded-xl border bg-white transition-shadow hover:shadow-medium ${
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border'
      }`}
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] w-full bg-background-secondary">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={typeLabel}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-text-tertiary">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
            </svg>
          </div>
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
      </div>
    </Link>
  )
}
