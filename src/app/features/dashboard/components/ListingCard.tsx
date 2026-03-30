import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Pencil, Power, PowerOff, Share2 } from 'lucide-react'
import ShareFormatModal from '@/components/ShareFormatModal'
import { Badge, Button } from '@/app/components/ui'
import { useToggleListingStatus } from '@/hooks/useListings'
import { blurHashToDataUrl } from '@/lib/blurhash'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import {
  PROPERTY_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  CURRENCY_SYMBOLS,
  type ListingStatus,
} from '@/types/enums'
import { getPriceSuffix } from '@/lib/formatters'

interface ListingCardProps {
  listing: Listing
  property: Property
}

const STATUS_VARIANTS: Record<ListingStatus, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
  draft: 'default',
  paymentPending: 'warning',
  active: 'success',
  expired: 'warning',
  deactivated: 'error',
  sold: 'info',
  rented: 'info',
}

function formatPrice(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency
  return `${symbol} ${amount.toLocaleString('es-PE')}`
}

export default function ListingCard({ listing, property }: ListingCardProps) {
  const toggleStatus = useToggleListingStatus()
  const [showShareModal, setShowShareModal] = useState(false)
  const photoUrl = property.media.thumbnailPhotoUrls?.[0] ?? property.media.propertyPhotoUrls[0]
  const microThumb = property.media.primaryPhotoMicroThumb
  const blurHash = property.media.photoBlurHashes?.[0]
  const blurDataUrl = useMemo(() => blurHashToDataUrl(blurHash), [blurHash])
  const placeholderUrl = microThumb
    ? `data:image/webp;base64,${microThumb}`
    : blurDataUrl
  const canToggle = listing.status === 'active' || listing.status === 'deactivated'

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-light transition-shadow hover:shadow-medium">
      {/* Photo */}
      <div
        className="relative h-48 bg-gray-100"
        style={placeholderUrl ? { backgroundImage: `url(${placeholderUrl})`, backgroundSize: 'cover' } : undefined}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={listing.description}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-text-tertiary">
            Sin imagen
          </div>
        )}
        <Badge
          variant={STATUS_VARIANTS[listing.status]}
          className="absolute top-3 left-3"
        >
          {LISTING_STATUS_LABELS[listing.status]}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price */}
        <p className="text-lg font-bold text-primary">
          {formatPrice(listing.price.amount, listing.price.currency)}
          {(() => {
            const suffix = getPriceSuffix(property.operationType, property.rentalDurationType)
            return suffix ? <span className="text-sm font-normal text-text-secondary"> {suffix}</span> : null
          })()}
        </p>

        {/* Property type */}
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
          {property.propertyType === 'habitacion' && property.specs.hasPrivateBathroom != null && (
            <span>{property.specs.hasPrivateBathroom ? 'Baño privado' : 'Baño compartido'}</span>
          )}
        </div>

        {/* View count */}
        <div className="mt-3 flex items-center gap-1 text-xs text-text-tertiary">
          <Eye className="h-3.5 w-3.5" />
          <span>{listing.viewCount} vista{listing.viewCount !== 1 ? 's' : ''}</span>
        </div>

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Link to={`/app/listings/${listing.id}/edit`} className="flex-1">
            <Button variant="text" className="w-full">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </Link>
          {listing.status === 'active' && (
            <Button variant="text" onClick={() => setShowShareModal(true)}>
              <Share2 className="h-4 w-4" />
              Compartir
            </Button>
          )}
          {canToggle && (
            <Button
              variant="text"
              isLoading={toggleStatus.isPending}
              onClick={() =>
                toggleStatus.mutate({
                  listingId: listing.id,
                  currentStatus: listing.status,
                })
              }
            >
              {listing.status === 'active' ? (
                <>
                  <PowerOff className="h-4 w-4" />
                  Desactivar
                </>
              ) : (
                <>
                  <Power className="h-4 w-4" />
                  Activar
                </>
              )}
            </Button>
          )}
        </div>

        {/* Share format modal */}
        <ShareFormatModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          listing={listing}
          property={property}
        />
      </div>
    </div>
  )
}
