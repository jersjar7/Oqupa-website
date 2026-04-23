import { Link } from 'react-router-dom'
import { Clock, CheckCircle, Eye, Phone, Pencil } from 'lucide-react'
import { Button, PhotoCarousel, PhotoOverlayBadge } from '@/app/components/ui'
import { getPriceSuffix } from '@/lib/formatters'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import { PROPERTY_TYPE_LABELS, CURRENCY_SYMBOLS } from '@/types/enums'

interface AgentAssignmentCardProps {
  listing: Listing
  property: Property
  onAccept?: () => void
  onDecline?: () => void
  isAccepting?: boolean
  isDeclining?: boolean
}

export default function AgentAssignmentCard({
  listing,
  property,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
}: AgentAssignmentCardProps) {
  const isPending = listing.assignmentStatus === 'pending_acceptance'
  const isAccepted = listing.assignmentStatus === 'accepted'
  const photos = property.media.photoKeys ?? property.media.propertyPhotoUrls ?? []
  const symbol = CURRENCY_SYMBOLS[listing.price.currency as keyof typeof CURRENCY_SYMBOLS] ?? listing.price.currency
  const suffix = getPriceSuffix(property.operationType, property.rentalDurationType)

  return (
    <div className={`flex h-full flex-col overflow-hidden rounded-2xl border-2 bg-white shadow-light ${
      isPending ? 'border-amber-400' : 'border-blue-400'
    }`}>
      {/* Status header */}
      <div className={`flex items-center gap-2 px-4 py-2 ${
        isPending ? 'bg-amber-50' : 'bg-blue-50'
      }`}>
        {isPending ? (
          <Clock className="h-4 w-4 text-amber-600" />
        ) : (
          <CheckCircle className="h-4 w-4 text-blue-600" />
        )}
        <span className={`text-xs font-semibold ${
          isPending ? 'text-amber-800' : 'text-blue-800'
        }`}>
          {isPending ? 'Pendiente de aceptación' : 'Asignación aceptada'}
        </span>
      </div>

      {/* Photo (carousel) */}
      <div className="relative">
        <PhotoCarousel
          photos={photos}
          blurHashes={property.media.photoBlurHashes}
          microThumb={property.media.primaryPhotoMicroThumb}
          alt={listing.description || `${PROPERTY_TYPE_LABELS[property.propertyType]} en ${property.location.distrito}`}
          className="h-48"
        />
        <PhotoOverlayBadge
          tone={isPending ? 'warning' : 'info'}
          className="absolute top-3 right-3"
        >
          {isPending ? 'Pendiente' : 'Aceptado'}
        </PhotoOverlayBadge>
      </div>

      {/* Content — grows to fill */}
      <div className="flex flex-1 flex-col p-4">
        <p className="font-sans text-lg font-bold text-primary line-clamp-1">
          {symbol} {listing.price.amount.toLocaleString('es-PE')}
          {suffix && <span className="font-normal text-text-secondary"> {suffix}</span>}
        </p>
        <p className="mt-1 text-sm text-text-secondary line-clamp-1">
          <span className="font-medium">{PROPERTY_TYPE_LABELS[property.propertyType]}</span>
          <span className="text-text-tertiary"> · </span>
          {property.location.distrito}
        </p>

        {/* Stats */}
        {isAccepted && (
          <div className="mt-2 flex gap-4 text-xs text-text-tertiary">
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {listing.viewCount} vistas
            </span>
            <span className="flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" />
              {listing.contactClickCount ?? 0} contactos
            </span>
          </div>
        )}

        {/* Footer — pinned via mt-auto */}
        <div className="mt-auto pt-3">
          {isAccepted && (
            <Link to={`/app/listings/${listing.id}/agent-edit`} className="block">
              <Button className="w-full gap-1.5">
                <Pencil className="h-4 w-4" />
                Editar
              </Button>
            </Link>
          )}
          {isPending && (
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={onAccept}
                isLoading={isAccepting}
                disabled={isDeclining}
              >
                Aceptar
              </Button>
              <Button
                variant="text"
                className="flex-1 !text-red-600 hover:!text-red-700"
                onClick={onDecline}
                isLoading={isDeclining}
                disabled={isAccepting}
              >
                Rechazar
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
