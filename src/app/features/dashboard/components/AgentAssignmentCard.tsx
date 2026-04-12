import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Clock, CheckCircle, Eye, Phone, Pencil } from 'lucide-react'
import { Badge, Button } from '@/app/components/ui'
import { blurHashToDataUrl } from '@/lib/blurhash'
import { card as cardUrl } from '@/lib/imageUrl'
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
  const photoRef = property.media.photoKeys?.[0] ?? property.media.propertyPhotoUrls[0]
  const photoUrl = photoRef ? cardUrl(photoRef) : undefined
  const microThumb = property.media.primaryPhotoMicroThumb
  const blurHash = property.media.photoBlurHashes?.[0]
  const blurDataUrl = useMemo(() => blurHashToDataUrl(blurHash), [blurHash])
  const placeholderUrl = microThumb
    ? `data:image/webp;base64,${microThumb}`
    : blurDataUrl
  const symbol = CURRENCY_SYMBOLS[listing.price.currency as keyof typeof CURRENCY_SYMBOLS] ?? listing.price.currency
  const suffix = getPriceSuffix(property.operationType, property.rentalDurationType)

  return (
    <div className={`overflow-hidden rounded-2xl border-2 shadow-light ${
      isPending ? 'border-amber-400 bg-white' : 'border-blue-400 bg-white'
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

      {/* Photo */}
      <div
        className="relative h-40 w-full bg-gray-100"
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
        <div className="absolute right-2 top-2">
          <Badge variant={isPending ? 'warning' : 'info'}>
            {isPending ? 'Pendiente' : 'Aceptado'}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-lg font-bold text-primary">
          {symbol} {listing.price.amount.toLocaleString('es-PE')}
          {suffix && <span className="text-sm font-normal text-text-secondary"> {suffix}</span>}
        </p>
        <p className="mt-1 text-sm text-text-secondary">
          {PROPERTY_TYPE_LABELS[property.propertyType]} en {property.location.distrito}
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

        {/* Edit button for accepted assignments */}
        {isAccepted && (
          <Link to={`/app/listings/${listing.id}/agent-edit`} className="mt-3 block">
            <Button className="w-full gap-1.5">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </Link>
        )}

        {/* Accept/Decline buttons */}
        {isPending && (
          <div className="mt-3 flex gap-2">
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
  )
}
