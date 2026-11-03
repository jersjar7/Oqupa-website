import { useState } from 'react'
import { bathroomsLabel, bedroomsLabel } from '@/lib/roomCounts'
import { Link } from 'react-router-dom'
import { CheckCircle2, Eye, Pencil, Power, PowerOff, Share2, Sparkles, Trash2, Users } from 'lucide-react'
import ShareFormatModal from '@/components/ShareFormatModal'
import { Button, PhotoCarousel, PhotoOverlayBadge } from '@/app/components/ui'
import DialogActions from '@/app/components/ui/DialogActions'
import { LISTING_STATUS_TONE } from '@/lib/listingStatusTone'
import { useToggleListingStatus, useDeleteListing, useMarkListingClosed, useSetRealtorHelp } from '@/hooks/useListings'
import CloseSurveyModal from './CloseSurveyModal'
import BoostStatusBadge from '@/app/features/boost/components/BoostStatusBadge'
import BoostPurchaseFlow from '@/app/features/boost/components/BoostPurchaseFlow'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import {
  PROPERTY_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  CURRENCY_SYMBOLS,
} from '@/types/enums'
import { getPriceSuffix } from '@/lib/formatters'
import { realtorHelpDisableWarning } from '@/lib/realtorHelpWarning'
import { AGENTS_WHEN_TURNED_ON, agentHelpOffer, agentHelpOnLine } from '@/lib/agentHelp'
import { isBoostLive } from '@/lib/boostState'

interface ListingCardProps {
  listing: Listing
  property: Property
}

/** A brand action: Gotham Bold, uppercase, tracked, 44px (audit 2026-11-02). */
const ACTION =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-secondary/40 px-3 font-sans text-xs font-bold uppercase tracking-[1px] text-secondary transition-colors hover:border-secondary hover:text-secondary-hover disabled:opacity-50'

function formatPrice(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency
  return `${symbol} ${amount.toLocaleString('es-PE')}`
}

export default function ListingCard({ listing, property }: ListingCardProps) {
  const toggleStatus = useToggleListingStatus()
  const deleteListing = useDeleteListing()
  const [showShareModal, setShowShareModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const markClosed = useMarkListingClosed()
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showCloseSurvey, setShowCloseSurvey] = useState(false)
  const [showRepublishConfirm, setShowRepublishConfirm] = useState(false)
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false)
  const setRealtorHelp = useSetRealtorHelp()
  const [showRealtorHelpOffer, setShowRealtorHelpOffer] = useState(false)
  const [showRealtorHelpOff, setShowRealtorHelpOff] = useState(false)

  const photos = property.media.photoKeys ?? property.media.propertyPhotoUrls ?? []
  const isClosed = listing.status === 'sold' || listing.status === 'rented'
  // Sold / rented listings can be published again, as in the app.
  // An old 'expired' reads Desactivado (ADR-014) and gets its actions.
  const isOff = listing.status === 'deactivated' || listing.status === 'expired'
  const canToggle = listing.status === 'active' || isOff || isClosed
  // Same rule and wording as the app: only an active listing, and only the
  // action that matches how it is offered.
  const isRental = property.operationType === 'alquiler'
  const canClose = listing.status === 'active'
  const canDelete = isOff || isClosed
  // Deactivating does not pause a boost: the expiry job ignores status, so the
  // paid days keep running and nothing is returned. A boosted listing asks
  // first and says so; an unboosted one has nothing to lose.
  // Boosted only while isBoosted AND boostedUntil is still ahead.
  const boostLive = isBoostLive(listing)
  // Asks unless the boost is known to be over: one with no end date written
  // still warns.
  const asksBeforeDeactivating =
    listing.status === 'active' && listing.isBoosted && (!listing.boostedUntil || boostLive)
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
            <span>{bedroomsLabel(property.specs.bedroomCount, { propertyType: property.propertyType })}</span>
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
        {boostLive && (
          <div className="mt-2">
            <BoostStatusBadge listing={listing} detailed />
          </div>
        )}

        {/* View count */}
        <div className="mt-3 flex items-center gap-1 text-xs text-text-tertiary">
          <Eye className="h-3.5 w-3.5" />
          <span>{listing.viewCount} vista{listing.viewCount !== 1 ? 's' : ''}</span>
        </div>

        {/* Boost CTA for non-boosted active listings. The flow stays mounted
            once the listing is boosted, so its confirmation is not lost when
            the card refreshes underneath it. */}
        {listing.status === 'active' && (
          <BoostPurchaseFlow listingId={listing.id} placement="my_listings">
            {(openFlow) => !boostLive && (
              <button
                onClick={openFlow}
                className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-boost px-4 font-sans text-sm font-bold uppercase tracking-[1px] text-ink transition-colors hover:bg-boost-hover"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
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
              <Link to={`/app/listings/${listing.id}/agents`} className="inline-flex min-h-11 items-center">
                <span className="text-xs font-medium text-secondary">Agente asignado</span>
              </Link>
            ) : (
              <Link
                to={`/app/listings/${listing.id}/agents`}
                className="inline-flex min-h-11 items-center gap-1 text-xs font-medium text-secondary hover:text-secondary-hover"
              >
                <Users className="h-3.5 w-3.5" />
                {listing.currentClaimsCount > 0
                  ? `${listing.currentClaimsCount} agente${listing.currentClaimsCount !== 1 ? 's' : ''} interesado${listing.currentClaimsCount !== 1 ? 's' : ''}`
                  : 'Esperando agentes...'}
              </Link>
            )}
          </div>
        )}

        {/* Agent help (ADR-043 D10): offered here after publishing, off
            until the owner turns it on. With an agent assigned the agents
            page above handles it. */}
        {listing.status === 'active' && !listing.assignedRealtorId && (
          <div className="mt-2">
            {listing.wantsRealtorHelp ? (
              <>
                <p className="mb-1 text-sm text-text-primary">{agentHelpOnLine(listing.maxRealtors ?? AGENTS_WHEN_TURNED_ON)}</p>
                <button type="button" className={ACTION} onClick={() => setShowRealtorHelpOff(true)}>
                  Desactivar ayuda de agentes
                </button>
              </>
            ) : (
              <button type="button" className={ACTION} onClick={() => setShowRealtorHelpOffer(true)}>
                <Users className="h-4 w-4" aria-hidden="true" />
                Ayuda de agentes
              </button>
            )}
          </div>
        )}
        {/* Turning it off releases and notifies the agents: it asks first,
            with the app's words (hostile review #5). */}
        {showRealtorHelpOff && (
          <div className="mt-3 rounded-lg border border-border bg-background-secondary p-3">
            <p className="text-sm font-medium text-text-primary">¿Desactivar la ayuda de agentes?</p>
            {realtorHelpDisableWarning({ assignmentStatus: listing.assignmentStatus, claimsCount: listing.currentClaimsCount ?? 0 }) && (
              <p className="mt-1 text-sm text-text-secondary">
                {realtorHelpDisableWarning({ assignmentStatus: listing.assignmentStatus, claimsCount: listing.currentClaimsCount ?? 0 })}
              </p>
            )}
            <DialogActions className="mt-3">
              <Button variant="text" onClick={() => setShowRealtorHelpOff(false)}>
                Cancelar
              </Button>
              <Button
                isLoading={setRealtorHelp.isPending}
                onClick={() =>
                  setRealtorHelp.mutate(
                    { listingId: listing.id, on: false },
                    { onSuccess: () => setShowRealtorHelpOff(false) },
                  )
                }
              >
                Sí, desactivar
              </Button>
            </DialogActions>
          </div>
        )}
        {showRealtorHelpOffer && (
          <div className="mt-3 rounded-lg border border-border bg-background-secondary p-3">
            <p className="text-sm text-text-secondary">
              {agentHelpOffer(isRental)}
            </p>
            <DialogActions className="mt-3">
              <Button variant="text" onClick={() => setShowRealtorHelpOffer(false)}>
                Cancelar
              </Button>
              <Button
                isLoading={setRealtorHelp.isPending}
                onClick={() =>
                  setRealtorHelp.mutate(
                    { listingId: listing.id, on: true },
                    { onSuccess: () => setShowRealtorHelpOffer(false) },
                  )
                }
              >
                Sí, activar
              </Button>
            </DialogActions>
          </div>
        )}

        {/* Actions — pinned to the bottom via mt-auto. Brand buttons, 44px
            tall (audit 2026-11-02: they were small lowercase text links). */}
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Link to={`/app/listings/${listing.id}/edit`} className={`${ACTION} flex-1`}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Editar
          </Link>
          {listing.status === 'active' && (
            <button type="button" className={ACTION} onClick={() => setShowShareModal(true)}>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Compartir
            </button>
          )}
          {canToggle && (
            <button
              type="button"
              className={ACTION}
              disabled={toggleStatus.isPending}
              onClick={() =>
                listing.status !== 'active'
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
                  <PowerOff className="h-4 w-4" aria-hidden="true" />
                  Desactivar
                </>
              ) : (
                <>
                  <Power className="h-4 w-4" aria-hidden="true" />
                  Volver a publicar
                </>
              )}
            </button>
          )}
          {canClose && (
            <button type="button" className={ACTION} onClick={() => setShowCloseConfirm(true)}>
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {isRental ? 'Marcar como alquilado' : 'Marcar como vendido'}
            </button>
          )}
          {/* Deactivated, Vendido or Alquilado can be deleted directly
              (ADR-046 #14); set apart from the other actions. */}
          {canDelete && (
            <div className="mt-2 w-full border-t border-border pt-2">
              <button
                type="button"
                className={`${ACTION} border-error/40 text-error hover:border-error hover:text-error-strong`}
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Eliminar
              </button>
            </div>
          )}
        </div>

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="mt-3 rounded-lg border border-error/20 bg-error/5 p-3">
            <p className="text-sm font-medium text-error-strong">
              ¿Eliminar esta publicación? Esta acción no se puede deshacer.
            </p>
            <DialogActions className="mt-3">
              <Button
                variant="text"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                isLoading={deleteListing.isPending}
                onClick={() =>
                  deleteListing.mutate(
                    { listingId: listing.id, propertyId: listing.propertyId },
                    { onSuccess: () => setShowDeleteConfirm(false) }
                  )
                }
              >
                Sí, eliminar
              </Button>
            </DialogActions>
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
            <DialogActions className="mt-3">
              <Button variant="text" onClick={() => setShowCloseConfirm(false)}>
                Cancelar
              </Button>
              <Button
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
            </DialogActions>
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
            <DialogActions className="mt-3">
              <Button variant="text" onClick={() => setShowDeactivateConfirm(false)}>
                Cancelar
              </Button>
              <Button
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
            </DialogActions>
          </div>
        )}

        {/* Put back on the map (deactivated, sold or rented) — the app's
            confirmation, now for every case (audit 2026-11-02) */}
        {showRepublishConfirm && (
          <div className="mt-3 rounded-lg border border-border bg-background-secondary p-3">
            <p className="text-sm font-medium text-text-primary">Volver a publicar</p>
            <p className="mt-1 text-sm text-text-secondary">
              ¿Quieres volver a publicar esta propiedad? Se mantendrá activa hasta que la desactives.
            </p>
            <DialogActions className="mt-3">
              <Button variant="text" onClick={() => setShowRepublishConfirm(false)}>
                Cancelar
              </Button>
              <Button
                isLoading={toggleStatus.isPending}
                onClick={() =>
                  toggleStatus.mutate(
                    { listingId: listing.id, currentStatus: listing.status },
                    { onSuccess: () => setShowRepublishConfirm(false) }
                  )
                }
              >
                Sí, volver a publicar
              </Button>
            </DialogActions>
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
