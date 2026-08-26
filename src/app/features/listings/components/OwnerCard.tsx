// "Publicado por" — who published this listing.
//
// Reads ONLY the four values denormalised onto the listing document by
// ADR-015 Phase 3.3 (kept current by onUserDocumentUpdated, stamped at
// creation by onListingCreated since 2026-08-26). It never touches the
// owner's user record: that record is private as of B6, and this card is
// the most public surface on the platform — a logged-out visitor sees it.
// The mobile app shows the same four values in the same order.
import { BadgeCheck } from 'lucide-react'
import { thumbnail } from '@/lib/imageUrl'
import type { Listing } from '@/types/listing'

export interface OwnerCardData {
  name: string
  photoKey: string | null
  isVerified: boolean
  memberSinceYear: number | null
}

/**
 * What the card shows, or null when it must not show at all.
 *
 * Hidden while an agent has ACCEPTED the listing: the WhatsApp button then
 * routes to the agent, and no agent identity is denormalised yet, so naming
 * the owner beside it would name the wrong person.
 */
export function ownerCardFor(listing: Listing): OwnerCardData | null {
  if (listing.assignmentStatus === 'accepted' && listing.assignedRealtorId) return null
  const name = listing.ownerDisplayName?.trim()
  return {
    name: name ? name : 'Propietario',
    photoKey: listing.ownerPhotoKey || null,
    isVerified: Boolean(listing.ownerIsVerified),
    memberSinceYear: listing.ownerMemberSinceYear ?? null,
  }
}

export function OwnerCard({ listing }: { listing: Listing }) {
  const data = ownerCardFor(listing)
  if (!data) return null

  const subtitle = data.memberSinceYear
    ? `Propietario · Miembro desde ${data.memberSinceYear}`
    : 'Propietario'

  return (
    <section aria-label="Publicado por" className="rounded-xl border border-border bg-surface p-4">
      <h3 className="font-sans text-sm font-medium uppercase tracking-[1px] text-text-secondary">
        Publicado por
      </h3>
      <div className="mt-3 flex items-center gap-3">
        {data.photoKey ? (
          <img
            src={thumbnail(data.photoKey)}
            alt=""
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/10 font-serif text-lg text-secondary"
          >
            {data.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold text-text-primary">
            <span className="truncate">{data.name}</span>
            {data.isVerified && (
              <BadgeCheck aria-label="Verificado" className="h-4 w-4 shrink-0 text-secondary" />
            )}
          </p>
          <p className="text-xs text-text-secondary">{subtitle}</p>
        </div>
      </div>
    </section>
  )
}
