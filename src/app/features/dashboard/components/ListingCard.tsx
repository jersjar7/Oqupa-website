import { useEffect, useId, useRef, useState } from 'react'
import { openedPhrase, shownPhrase } from '@/lib/countWords'
import { bathroomsLabel, bedroomsLabel } from '@/lib/roomCounts'
import { Link } from 'react-router-dom'
import { Eye, MoreHorizontal, Pencil, Power, Sparkles } from 'lucide-react'
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
import { boostDaysLeft as boostDaysLeftFor } from '@/app/features/boost/lib/boostDaysLeft'

interface ListingCardProps {
  listing: Listing
  property: Property
  /** ADR-051: lifetime Apariciones (owner-only total); undefined while unknown. */
  apariciones?: number
}

/** A brand action: Gotham Bold, uppercase, tracked, 44px (audit 2026-11-02). */
const ACTION =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-secondary/40 px-3 font-sans text-xs font-bold uppercase tracking-[1px] text-secondary transition-colors hover:border-secondary hover:text-secondary-hover disabled:opacity-50'

/** The card's one main action: 48px, green outline, as in the app. */
const PRIMARY =
  'inline-flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-full border-[1.5px] border-secondary bg-white px-4 font-sans text-xs font-bold uppercase tracking-[1px] text-secondary transition-colors hover:bg-background-secondary disabled:opacity-50'
/** Volver a publicar: the same button, filled, as the app does. */
const PRIMARY_FILLED = `${PRIMARY.replace('bg-white', 'bg-secondary').replace('text-secondary', 'text-white').replace('hover:bg-background-secondary', 'hover:bg-secondary-hover')}`
/** Room the menu needs below ⋯ (tab bar included) before it opens upward. */
const MENU_ROOM = 360
/** One entry in the "⋯" menu. */
const MENU_ITEM =
  'flex min-h-11 w-full items-center px-4 text-left font-sans text-[15px] text-text-primary transition-colors hover:bg-background-secondary disabled:opacity-50'

function formatPrice(amount: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] ?? currency
  return `${symbol} ${amount.toLocaleString('es-PE')}`
}

export default function ListingCard({ listing, property, apariciones }: ListingCardProps) {
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
  const [showRealtorHelpOff, setShowRealtorHelpOff] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuUp, setMenuUp] = useState(false)
  const menuId = useId()
  const actionsRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLButtonElement>(null)
  const closeMenu = () => setMenuOpen(false)

  // The menu closes on a click outside it, and on Escape (focus back on ⋯).
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e: MouseEvent) => {
      if (!actionsRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMenuOpen(false)
      moreRef.current?.focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

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
  // Round-up days, 30 on the day of purchase (fix/boost-days).
  const boostDaysLeft = boostDaysLeftFor(listing.boostedUntil, listing.boostTier)
  const editPath = `/app/listings/${listing.id}/edit`
  // Editar is the main button only on a live boost; elsewhere it is in ⋯.
  const primaryIsEditar = listing.status === 'active' && boostLive
  // Same rule as the app (bug B3): help on OR an agent assigned, active only.
  const showAgents = listing.status === 'active' && (listing.wantsRealtorHelp || !!listing.assignedRealtorId)
  const hasInterestedAgents = showAgents && (listing.currentClaimsCount ?? 0) > 0

  return (
    // No overflow-hidden on the card: it clipped the ⋯ menu (2026-11-08). The
    // photo rounds its own top corners; an open menu lifts the card above the
    // one below it.
    <div
      data-testid="owner-listing-card"
      className={`relative flex h-full flex-col rounded-2xl border border-border bg-white shadow-light transition-shadow hover:shadow-medium ${menuOpen ? 'z-30' : ''}`}
    >
      {/* Photo (carousel) */}
      <div className="relative overflow-hidden rounded-t-2xl">
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
          <span>{openedPhrase(listing.viewCount ?? 0, property.propertyType)}</span>
          {/* ADR-051: the owner's second number; hidden while unknown, never a false 0. */}
          {apariciones !== undefined && (
            <>
              <span aria-hidden="true">·</span>
              <span>{shownPhrase(apariciones)}</span>
            </>
          )}
        </div>

        {/* Actions: one main button and "⋯" with the rest, as in the app
            (Jerson 2026-11-08). The main one follows the listing: Destacar,
            Editar once boosted, Volver a publicar when off or closed. The
            boost flow stays mounted while active, so its confirmation is not
            lost when the card refreshes to boosted underneath it. */}
        <div ref={actionsRef} className="relative mt-3 flex gap-2">
          {listing.status === 'active' ? (
            <BoostPurchaseFlow listingId={listing.id} placement="my_listings">
              {(openFlow) =>
                boostLive ? (
                  <Link to={editPath} className={PRIMARY}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                    Editar
                  </Link>
                ) : (
                  // ADR-042: available, not promoted — a green outline, as in the app.
                  <button type="button" onClick={openFlow} className={PRIMARY}>
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Destacar
                  </button>
                )
              }
            </BoostPurchaseFlow>
          ) : canToggle ? (
            <button
              type="button"
              className={PRIMARY_FILLED}
              disabled={toggleStatus.isPending}
              onClick={() => setShowRepublishConfirm(true)}
            >
              <Power className="h-4 w-4" aria-hidden="true" />
              Volver a publicar
            </button>
          ) : (
            <Link to={editPath} className={PRIMARY}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Editar
            </Link>
          )}
          <button
            ref={moreRef}
            type="button"
            aria-label="Más opciones"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => {
              // Opens upward when the screen has no room below (the phone's
              // tab bar hid the last entries, 2026-11-08).
              const r = moreRef.current?.getBoundingClientRect()
              const below = r ? window.innerHeight - r.bottom : Infinity
              setMenuUp(!!r && below < MENU_ROOM && r.top > below)
              setMenuOpen((o) => !o)
            }}
            className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[13px] border border-separator bg-white text-text-secondary transition-colors hover:bg-background-secondary"
          >
            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
            {/* Interested agents wait inside the menu, as the app's dot says. */}
            {hasInterestedAgents && (
              <span
                data-testid="interested-agents-dot"
                className="absolute -top-[3px] -right-[3px] h-3 w-3 rounded-full border-2 border-white bg-primary"
              />
            )}
          </button>
          {menuOpen && (
            <div
              id={menuId}
              data-testid="listing-actions-menu"
              data-placement={menuUp ? 'up' : 'down'}
              className={`absolute right-0 ${menuUp ? 'bottom-14' : 'top-14'} z-20 flex w-60 flex-col rounded-[14px] border border-border bg-white py-1.5 shadow-medium`}
            >
              <Link to={`/property/${listing.id}`} className={MENU_ITEM} onClick={closeMenu}>
                Ver publicación
              </Link>
              {!primaryIsEditar && (
                <Link to={editPath} className={MENU_ITEM} onClick={closeMenu}>
                  Editar
                </Link>
              )}
              {listing.status === 'active' && (
                <button type="button" className={MENU_ITEM} onClick={() => { closeMenu(); setShowShareModal(true) }}>
                  Compartir
                </button>
              )}
              {/* Reachable while an agent is assigned too (bug B3): the
                  agents page is the owner's only way to "Quitar agente". */}
              {showAgents && (
                <Link to={`/app/listings/${listing.id}/agents`} className={MENU_ITEM} onClick={closeMenu}>
                  {`Ver agentes interesados (${listing.currentClaimsCount ?? 0})`}
                </Link>
              )}
              {listing.status === 'active' && (
                <>
                  <div className="my-1 h-px bg-border" aria-hidden="true" />
                  <button
                    type="button"
                    className={MENU_ITEM}
                    disabled={toggleStatus.isPending}
                    onClick={() => {
                      closeMenu()
                      if (asksBeforeDeactivating) setShowDeactivateConfirm(true)
                      else toggleStatus.mutate({ listingId: listing.id, currentStatus: listing.status })
                    }}
                  >
                    Desactivar
                  </button>
                </>
              )}
              {canClose && (
                <button type="button" className={MENU_ITEM} onClick={() => { closeMenu(); setShowCloseConfirm(true) }}>
                  {isRental ? 'Marcar como alquilado' : 'Marcar como vendido'}
                </button>
              )}
              {/* Deactivated, Vendido or Alquilado can be deleted directly
                  (ADR-046 #14): last, set apart, in red; it still asks. */}
              {canDelete && (
                <>
                  <div className="my-1 h-px bg-border" aria-hidden="true" />
                  <button
                    type="button"
                    className={`${MENU_ITEM} text-error-strong`}
                    onClick={() => { closeMenu(); setShowDeleteConfirm(true) }}
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Agent help (ADR-043 D10): offered after publishing, off until the
            owner turns it on — the app's box, explained, one button. With an
            agent assigned the agents page handles it. */}
        {listing.status === 'active' && !listing.assignedRealtorId && (
          listing.wantsRealtorHelp ? (
            <div className="mt-3">
              <p className="mb-1 text-sm text-text-primary">{agentHelpOnLine(listing.maxRealtors ?? AGENTS_WHEN_TURNED_ON)}</p>
              <button type="button" className={ACTION} onClick={() => setShowRealtorHelpOff(true)}>
                Desactivar ayuda de agentes
              </button>
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-background-secondary p-3">
              <p className="font-sans text-sm font-medium uppercase tracking-wide text-secondary">AYUDA DE AGENTES</p>
              <p className="mt-1.5 text-[13px] leading-snug text-text-primary">{agentHelpOffer(isRental)}</p>
              <button
                type="button"
                className="mt-2.5 inline-flex min-h-11 items-center rounded-full bg-secondary px-5 font-sans text-[13px] font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-secondary-hover disabled:opacity-50"
                disabled={setRealtorHelp.isPending}
                onClick={() => setRealtorHelp.mutate({ listingId: listing.id, on: true })}
              >
                Sí, activar
              </button>
            </div>
          )
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
