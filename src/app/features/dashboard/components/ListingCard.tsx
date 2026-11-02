import { useCallback, useState } from 'react'
import { bathroomsLabel } from '@/lib/roomCounts'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Eye, Pencil, Power, PowerOff, Share2, Sparkles, Trash2, Users } from 'lucide-react'
import ShareFormatModal from '@/components/ShareFormatModal'
import { Badge, Button, PhotoCarousel, PhotoOverlayBadge } from '@/app/components/ui'
import { LISTING_STATUS_TONE } from '@/lib/listingStatusTone'
import { useToggleListingStatus, useDeleteListing, useMarkListingClosed } from '@/hooks/useListings'
import CloseSurveyModal from './CloseSurveyModal'
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
} from '@/types/enums'
import { getPriceSuffix } from '@/lib/formatters'

interface ListingCardProps {
  listing: Listing
  property: Property
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
  const markClosed = useMarkListingClosed()
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showCloseSurvey, setShowCloseSurvey] = useState(false)
  const [showRepublishConfirm, setShowRepublishConfirm] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)

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
  const isClosed = listing.status === 'sold' || listing.status === 'rented'
  // Sold / rented listings can be published again, as in the app.
  const canToggle = listing.status === 'active' || listing.status === 'deactivated' || isClosed
  // Same rule and wording as the app: only an active listing, and only the
  // action that matches how it is offered.
  const isRental = property.operationType === 'alquiler'
  const canClose = listing.status === 'active'
  // Deactivating does not pause a boost: the expiry job ignores status, so the
  // paid days keep running and nothing is returned. A boosted listing asks
  // first and says so; an unboosted one has nothing to lose.
  const asksBeforeDeactivating = listing.status === 'active' && listing.isBoosted
  const boostDaysLeft = listing.boostedUntil
    ? Math.max(0, Math.ceil((listing.boostedUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

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
          tone={LISTING_STATUS_TONE[listing.status]}
          className="absolute top-3 left-3"
        >
          {LISTING_STATUS_LABELS[listing.status]}
        </PhotoOverlayBadge>
      </div>

      {/* Content — grows to fill so footers pin to bottom */}
      <div className="flex flex-1 flex-col p-4">
        {/* Price */}
        <p className="font-serif text-xl font-normal text-secondary line-clamp-1">
          {formatPrice(listing.price.amount, listing.price.currency)}
          {(() => {
            const suffix = getPriceSuffix(property.operationType, property.rentalDurationType)
            return suffix ? <span className="font-sans text-sm font-normal text-text-secondary"> {suffix}</span> : null
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
          {bathroomsLabel(property.specs.bathroomCount) && (
            <span>{bathroomsLabel(property.specs.bathroomCount)}</span>
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
            placement="my_listings"
            onSuccess={handleBoostSuccess}
          >
            {(openFlow) => (
              <button
                onClick={openFlow}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-boost/20 px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-boost/30"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Destacar mi propiedad
              </button>
            )}
          </BoostPurchaseFlow>
        )}

        {/* Realtor agents */}
        {/* Reachable while an agent is assigned too, as in the app (bug B3):
            the agents page is the owner's only way to "Quitar agente". */}
        {(listing.wantsRealtorHelp || listing.assignedRealtorId) && listing.status === 'active' && (
          <div className="mt-2">
            {listing.assignedRealtorId ? (
              <Link to={`/app/listings/${listing.id}/agents`} className="inline-flex">
                <Badge variant="info">Agente asignado</Badge>
              </Link>
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
                isClosed
                  ? setShowRepublishConfirm(true)
                  : asksBeforeDeactivating
                  ? setShowDeactivateConfirm(true)
                  : toggleStatus.mutate({
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
                  {isClosed ? 'Volver a publicar' : 'Activar'}
                </>
              )}
            </Button>
          )}
          {canClose && (
            <Button variant="text" onClick={() => setShowCloseConfirm(true)}>
              <CheckCircle2 className="h-4 w-4" />
              {isRental ? 'Marcar como alquilado' : 'Marcar como vendido'}
            </Button>
          )}
          {listing.status === 'deactivated' && (
            <Button
              variant="text"
              className="text-error hover:text-error-strong"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </Button>
          )}
        </div>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="mt-3 rounded-lg border border-error/20 bg-error/5 p-3">
            <p className="text-sm font-medium text-error-strong">
              ¿Eliminar esta publicación? Esta acción no se puede deshacer.
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                variant="text"
                className="text-error hover:text-error-strong"
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

        {/* Vendido / Alquilado confirmation — the app's words */}
        {showCloseConfirm && (
          <div className="mt-3 rounded-lg border border-border bg-background-secondary p-3">
            <p className="text-sm font-medium text-text-primary">
              {isRental ? 'Marcar como Alquilado' : 'Marcar como Vendido'}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {isRental
                ? '¿Ya encontraste inquilino? La publicación se ocultará y podrás volver a publicarla cuando el contrato termine.'
                : '¿Ya vendiste la propiedad? La publicación se cerrará.'}
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                variant="text"
                isLoading={markClosed.isPending}
                onClick={() =>
                  markClosed.mutate(
                    { listingId: listing.id, status: isRental ? 'rented' : 'sold' },
                    {
                      onSuccess: () => {
                        setShowCloseConfirm(false)
                        setShowCloseSurvey(true)
                      },
                    }
                  )
                }
              >
                {isRental ? 'Sí, alquilado' : 'Sí, vendido'}
              </Button>
              <Button variant="text" onClick={() => setShowCloseConfirm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Desactivar a boosted listing — the paid days keep running */}
        {showDeactivateConfirm && (
          <div className="mt-3 rounded-lg border border-border bg-background-secondary p-3">
            <p className="text-sm font-medium text-text-primary">¿Desactivar esta publicación?</p>
            <p className="mt-1 text-sm text-text-secondary">
              {boostDaysLeft
                ? boostDaysLeft === 1
                  ? 'Te queda 1 día de destacado. Sigue corriendo mientras esté desactivada.'
                  : `Te quedan ${boostDaysLeft} días de destacado. Siguen corriendo mientras esté desactivada.`
                : 'Los días de tu destacado siguen corriendo mientras esté desactivada.'}
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                variant="text"
                isLoading={toggleStatus.isPending}
                onClick={() =>
                  toggleStatus.mutate(
                    { listingId: listing.id, currentStatus: listing.status },
                    { onSuccess: () => setShowDeactivateConfirm(false) }
                  )
                }
              >
                Sí, desactivar
              </Button>
              <Button variant="text" onClick={() => setShowDeactivateConfirm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Re-publish a sold / rented listing — the app's confirmation */}
        {showRepublishConfirm && (
          <div className="mt-3 rounded-lg border border-border bg-background-secondary p-3">
            <p className="text-sm font-medium text-text-primary">Re-publicar propiedad</p>
            <p className="mt-1 text-sm text-text-secondary">
              ¿Quieres volver a publicar esta propiedad? Se mantendrá activa hasta que la desactives.
            </p>
            <div className="mt-2 flex gap-2">
              <Button
                variant="text"
                isLoading={toggleStatus.isPending}
                onClick={() =>
                  toggleStatus.mutate(
                    { listingId: listing.id, currentStatus: listing.status },
                    { onSuccess: () => setShowRepublishConfirm(false) }
                  )
                }
              >
                Sí, re-publicar
              </Button>
              <Button variant="text" onClick={() => setShowRepublishConfirm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <CloseSurveyModal
          isOpen={showCloseSurvey}
          listingId={listing.id}
          isRental={isRental}
          onClose={() => setShowCloseSurvey(false)}
        />

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
