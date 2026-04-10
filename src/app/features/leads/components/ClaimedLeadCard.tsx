import { useMemo } from 'react'
import { MessageCircle } from 'lucide-react'
import { Badge, Button } from '@/app/components/ui'
import { blurHashToDataUrl } from '@/lib/blurhash'
import { getPriceSuffix } from '@/lib/formatters'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import type { RealtorClaim } from '@/types/realtorClaim'
import {
  PROPERTY_TYPE_LABELS,
  CURRENCY_SYMBOLS,
} from '@/types/enums'

interface ClaimedLeadCardProps {
  claim: RealtorClaim
  listing: Listing
  property: Property
}

function formatPrice(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency
  return `${symbol} ${amount.toLocaleString('es-PE')}`
}

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `Hace ${diffMinutes} minutos`
    }
    return `Hace ${diffHours} horas`
  }
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} dias`
  const weeks = Math.floor(diffDays / 7)
  return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
}

export default function ClaimedLeadCard({ claim, listing, property }: ClaimedLeadCardProps) {
  const photoUrl = property.media.thumbnailPhotoUrls?.[0] ?? property.media.propertyPhotoUrls[0]
  const microThumb = property.media.primaryPhotoMicroThumb
  const blurHash = property.media.photoBlurHashes?.[0]
  const blurDataUrl = useMemo(() => blurHashToDataUrl(blurHash), [blurHash])
  const placeholderUrl = microThumb
    ? `data:image/webp;base64,${microThumb}`
    : blurDataUrl
  const isAssigned = listing.assignedRealtorId === claim.realtorId
  const whatsappPhone = listing.contactInfo?.whatsappPhoneNumber?.replace(/[^\d+]/g, '')

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-light">
      <div className="flex flex-col sm:flex-row">
        {/* Photo */}
        <div
          className="relative h-48 w-full shrink-0 bg-gray-100 sm:h-auto sm:w-48"
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
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
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
            </div>

            {/* Badges */}
            <div className="flex flex-col gap-1">
              <Badge variant="success">Reclamado</Badge>
              {isAssigned && <Badge variant="info">Asignado</Badge>}
            </div>
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

          {/* Claim date */}
          <p className="mt-2 text-xs text-text-tertiary">
            {formatRelativeDate(claim.claimedAt)}
          </p>

          {/* WhatsApp contact */}
          {whatsappPhone && (
            <div className="mt-3">
              <a
                href={`https://wa.me/${whatsappPhone}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="text" className="text-green-600 hover:text-green-700">
                  <MessageCircle className="h-4 w-4" />
                  Contactar por WhatsApp
                </Button>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
