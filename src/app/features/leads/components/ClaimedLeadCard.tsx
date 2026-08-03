import { useState } from 'react'
/**
 * ClaimedLeadCard — vertical property card used on Oportunidades → En Espera
 * for claims the agent is still waiting on the owner to decide. Shares its
 * shape with ListingCard and AgentAssignmentCard so all tabs render a
 * uniform grid.
 *
 * Scope (as of 2026-04-22): this card is only ever used for WAITING claims.
 * Invitations (pending_acceptance) and accepted assignments render via
 * AgentAssignmentCard instead. So the pending-acceptance/accept-banner
 * branches that used to live here have been removed — they'd be unreachable
 * in the new IA.
 *
 * `statusBadge` is optional and lets the parent swap the default
 * "Reclamado" chip for richer state copy.
 */
import { MessageCircle } from 'lucide-react'
import { PhotoCarousel, PhotoOverlayBadge } from '@/app/components/ui'
import { getPriceSuffix } from '@/lib/formatters'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import type { RealtorClaim } from '@/types/realtorClaim'
import {
  PROPERTY_TYPE_LABELS,
  CURRENCY_SYMBOLS,
} from '@/types/enums'
import { toast } from 'sonner'
import { contactService } from '@/services/contactService'

interface ClaimedLeadCardProps {
  claim: RealtorClaim
  listing: Listing
  property: Property
  statusBadge?: React.ReactNode
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
      if (diffMinutes <= 0) return 'Ahora mismo'
      return `Hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`
    }
    return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
  }
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  const weeks = Math.floor(diffDays / 7)
  return `Hace ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`
}

export default function ClaimedLeadCard({
  claim, listing, property, statusBadge,
}: ClaimedLeadCardProps) {
  const photos = property.media.photoKeys ?? property.media.propertyPhotoUrls ?? []
  // The owner's number is no longer read off the listing (ADR-015 Phase 3.4).
  // The agent asks the server, which checks they actually hold a claim on THIS
  // listing before disclosing it, and records that it did.
  const [opening, setOpening] = useState(false)

  async function openWhatsApp() {
    if (opening) return
    setOpening(true)
    try {
      const contact = await contactService.getListingContact(listing.id)
      window.open(
        `https://wa.me/${contact.phone.replace(/[^\d+]/g, '')}`,
        '_blank',
        'noopener,noreferrer',
      )
    } catch {
      toast.error('No se pudo obtener el contacto del propietario.')
    } finally {
      setOpening(false)
    }
  }
  const priceSuffix = getPriceSuffix(property.operationType, property.rentalDurationType)

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-light transition-shadow hover:shadow-medium">
      {/* Photo (carousel) + status badge overlay */}
      <div className="relative">
        <PhotoCarousel
          photos={photos}
          blurHashes={property.media.photoBlurHashes}
          microThumb={property.media.primaryPhotoMicroThumb}
          alt={listing.description || `${PROPERTY_TYPE_LABELS[property.propertyType]} en ${property.location.distrito}`}
          className="h-48"
        />
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 pointer-events-none">
          <div className="pointer-events-auto flex flex-wrap justify-end gap-1">
            {statusBadge ?? <PhotoOverlayBadge tone="success">Reclamado</PhotoOverlayBadge>}
          </div>
        </div>
      </div>

      {/* Content — grows to fill so the footer pins to the bottom */}
      <div className="flex flex-1 flex-col p-4">
        {/* Price */}
        <p className="font-sans text-lg font-bold text-primary line-clamp-1">
          {formatPrice(listing.price.amount, listing.price.currency)}
          {priceSuffix && (
            <span className="font-normal text-text-secondary"> {priceSuffix}</span>
          )}
        </p>

        {/* Property type · district */}
        <p className="mt-1 text-sm text-text-secondary line-clamp-1">
          <span className="font-medium">{PROPERTY_TYPE_LABELS[property.propertyType]}</span>
          <span className="text-text-tertiary"> · </span>
          {property.location.distrito}
        </p>

        {/* Specs — single line, wraps if needed but clamped to 1 line on narrow */}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-secondary">
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

        {/* Claim date (caption — Roboto Serif italic per brand deck) */}
        <p className="mt-2 font-serif text-xs italic text-text-tertiary">
          Reclamaste {formatRelativeDate(claim.claimedAt).toLowerCase()}
        </p>

        {/* Footer — pinned via mt-auto */}
        <div className="mt-auto pt-3">
          <button
            type="button"
            onClick={openWhatsApp}
            disabled={opening}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700 disabled:opacity-50"
          >
            <MessageCircle className="h-4 w-4" />
            Contactar por WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
