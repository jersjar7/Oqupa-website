import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, Pencil, Power, PowerOff, Share2, Sparkles, Trash2, Users } from 'lucide-react'
import ShareFormatModal from '@/components/ShareFormatModal'
import { Badge, Button, PhotoCarousel, PhotoOverlayBadge } from '@/app/components/ui'
import type { PhotoOverlayTone } from '@/app/components/ui/PhotoOverlayBadge'
import { useToggleListingStatus, useDeleteListing } from '@/hooks/useListings'
import BoostStatusBadge from '@/app/features/boost/components/BoostStatusBadge'
import BoostPurchaseFlow from '@/app/features/boost/components/BoostPurchaseFlow'
import { useAuthStore } from '@/stores/authStore'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import type { BoostTier } from '@/types/boost'
import type { ListingWithProperty } from '@/types/explore'
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

const STATUS_OVERLAY_TONE: Record<ListingStatus, PhotoOverlayTone> = {
  draft: 'neutral',
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
  const deleteListing = useDeleteListing()
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [showShareModal, setShowShareModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleBoostSuccess = useCallback(
    ({ tier, durationDays }: { tier: BoostTier; durationDays: number }) => {
      const userId = user?.id
      if (!userId) return

      const boostedUntil = new Date()
      boostedUntil.setDate(boostedUntil.getDate() + durationDays)

      // Optimistically update the listing in the React Query cache
      queryClient.setQueryData<ListingWithProperty[]>(
        ['listings', 'user', userId, 'withProperties'],
        (old) =>
          old?.map((item) =>
            item.listing.id === listing.id
              ? {
                  ...item,
                  listing: {
                    ...item.listing,
                    isBoosted: true,
                    boostTier: tier,
                    boostScore: 100,
                    boostedUntil,
                  },
                }
              : item,
          ),
      )
    },
    [queryClient, user?.id, listing.id],
  )
  const photos = property.media.photoKeys ?? property.media.propertyPhotoUrls ?? []
  const canToggle = listing.status === 'active' || listing.status === 'deactivated'

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-light transition-shadow hover:shadow-medium">
      {/* Photo (carousel) */}
      <div className="relative">
        <PhotoCarousel
          photos={photos}
          blurHashes={property.media.photoBlurHashes}
          microThumb={property.media.primaryPhotoMicroThumb}
          alt={listing.description}
          className="h-48"
        />
        <PhotoOverlayBadge
          tone={STATUS_OVERLAY_TONE[listing.status]}
          className="absolute top-3 left-3"
        >
          {LISTING_STATUS_LABELS[listing.status]}
        </PhotoOverlayBadge>
      </div>

      {/* Content — grows to fill so footers pin to bottom */}
      <div className="flex flex-1 flex-col p-4">
        {/* Price */}
        <p className="font-sans text-lg font-bold text-primary line-clamp-1">
          {formatPrice(listing.price.amount, listing.price.currency)}
          {(() => {
            const suffix = getPriceSuffix(property.operationType, property.rentalDurationType)
            return suffix ? <span className="text-sm font-normal text-text-secondary"> {suffix}</span> : null
          })()}
        </p>

        {/* Property type */}
        <p className="mt-1 text-sm text-text-secondary line-clamp-1">
          <span className="font-medium">{PROPERTY_TYPE_LABELS[property.propertyType]}</span>
          <span className="text-text-tertiary"> · </span>
          {property.location.distrito}
        </p>

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

        {/* Boost status */}
        {listing.isBoosted && (
          <div className="mt-2">
            <BoostStatusBadge listing={listing} detailed />
          </div>
        )}

        {/* View count */}
        <div className="mt-3 flex items-center gap-1 text-xs text-text-tertiary">
          <Eye className="h-3.5 w-3.5" />
          <span>{listing.viewCount} vista{listing.viewCount !== 1 ? 's' : ''}</span>
        </div>

        {/* Boost CTA for non-boosted active listings */}
        {listing.status === 'active' && !listing.isBoosted && (
          <BoostPurchaseFlow
            listingId={listing.id}
            onSuccess={handleBoostSuccess}
          >
            {(openFlow) => (
              <button
                onClick={openFlow}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-500/20"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Destacar mi propiedad
              </button>
            )}
          </BoostPurchaseFlow>
        )}

        {/* Realtor agents */}
        {listing.wantsRealtorHelp && listing.status === 'active' && (
          <div className="mt-2">
            {listing.assignedRealtorId ? (
              <Badge variant="info">Agente asignado</Badge>
            ) : (
              <Link
                to={`/app/listings/${listing.id}/agents`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover"
              >
                <Users className="h-3.5 w-3.5" />
                {listing.currentClaimsCount > 0
                  ? `${listing.currentClaimsCount} agente${listing.currentClaimsCount !== 1 ? 's' : ''} interesado${listing.currentClaimsCount !== 1 ? 's' : ''}`
                  : 'Esperando agentes...'}
              </Link>
            )}
          </div>
        )}

        {/* Actions — pinned to the bottom via mt-auto */}
        <div className="mt-auto pt-4 flex flex-wrap gap-2">
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
          {listing.status === 'deactivated' && (
            <Button
              variant="text"
              className="text-red-600 hover:text-red-700"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          )}
        </div>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm font-medium text-red-800">
              ¿Eliminar esta publicación? Esta acción no se puede deshacer.
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                variant="text"
                className="text-red-600 hover:text-red-700"
                isLoading={deleteListing.isPending}
                onClick={() =>
                  deleteListing.mutate(
                    { listingId: listing.id, propertyId: listing.propertyId },
                    { onSuccess: () => setShowDeleteConfirm(false) }
                  )
                }
              >
                Eliminar
              </Button>
              <Button
                variant="text"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

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
