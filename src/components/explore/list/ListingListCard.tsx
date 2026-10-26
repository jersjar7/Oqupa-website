// One listing in the list (map plan steps 3–4, ADR-031): a large photo with its
// photo count, then the price large beside the same drawing and type word as
// the map pin, the details that matter for this type, and where it is. The
// words are kept to three tight lines so the photo gets the height (Jerson,
// 2026-10-24); the card stays about as tall as before.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AnimatedImage } from '@/app/components/ui'
import { blurHashToDataUrl } from '@/lib/blurhash'
import { card as cardUrl } from '@/lib/imageUrl'
import { pinLabelFor, pinKindWord } from '@/lib/map/pinLabel'
import { listingDetailsLine, listingLocationLine } from '@/lib/map/listLogic'
import { drawingSvg, PIN_COLORS } from '@/components/explore/mapbox/pinElements'
import SaveButton from '@/components/lists/SaveButton'
import type { ListingWithProperty } from '@/types/explore'

interface ListingListCardProps {
  item: ListingWithProperty
  isHighlighted?: boolean
}

export default function ListingListCard({ item, isHighlighted = false }: ListingListCardProps) {
  const { listing, property } = item
  const label = pinLabelFor(item)
  const color = property.operationType === 'alquiler' ? PIN_COLORS.alquiler : PIN_COLORS.venta
  const photos = property.media.photoKeys?.length ? property.media.photoKeys : property.media.propertyPhotoUrls
  const photoRef = photos[0]
  const blurHash = property.media.photoBlurHashes?.[0]
  const microThumb = property.media.primaryPhotoMicroThumb
  const blurDataUrl = useMemo(() => blurHashToDataUrl(blurHash), [blurHash])
  const placeholderUrl = microThumb ? `data:image/webp;base64,${microThumb}` : blurDataUrl
  const details = listingDetailsLine(item)

  return (
    <div
      data-testid="listing-list-card"
      className={`relative overflow-hidden rounded-2xl bg-white shadow-light ${
        listing.isBoosted ? 'border-2 border-amber-500' : isHighlighted ? 'border border-primary ring-2 ring-primary/20' : 'border border-border'
      }`}
    >
      <Link to={`/property/${listing.id}`} className="block">
        <div
          className="relative aspect-[11/8] w-full overflow-hidden bg-background-secondary"
          style={placeholderUrl ? { backgroundImage: `url(${placeholderUrl})`, backgroundSize: 'cover' } : undefined}
        >
          {photoRef && (
            <AnimatedImage src={cardUrl(photoRef)} alt={`${pinKindWord(label.kind)} en ${listingLocationLine(item)}`} className="h-full w-full object-cover" />
          )}
          {listing.isBoosted && (
            <span className="absolute left-3 top-3 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold tracking-wide text-[#1F2937]">
              DESTACADO
            </span>
          )}
          {photos.length > 1 && (
            <span className="absolute bottom-3 right-3 rounded-lg bg-black/55 px-2 py-0.5 text-xs text-white">
              1 / {photos.length}
            </span>
          )}
        </div>
        <div className="flex flex-col px-3.5 pb-3 pt-2">
          <div className="flex flex-wrap items-center gap-x-2">
            {/* Short of room, the type word moves under the price; neither is
                ever cut ("DEPARTAMEN…" beside "US$ 98 mil", 2026-10-25). */}
            <span className="shrink-0 whitespace-nowrap text-xl font-bold leading-snug text-text-primary">{label.priceLine}</span>
            <span data-role="type-word" className="ml-auto flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-bold tracking-wide" style={{ color }}>
              <span className="shrink-0" dangerouslySetInnerHTML={{ __html: drawingSvg(label.kind, 18, color).replace(/fill="#fff"/g, `fill="${color}"`).replace(/stroke="#fff"/g, `stroke="${color}"`).replace(/fill="currentColor"/g, 'fill="#fff"') }} />
              <span>{pinKindWord(label.kind)}</span>
            </span>
          </div>
          {details && <span className="truncate text-sm leading-snug text-text-secondary">{details}</span>}
          <span className="truncate text-[13px] leading-snug text-text-tertiary">{listingLocationLine(item)}</span>
        </div>
      </Link>
      <SaveButton listingId={listing.id} className="absolute right-3 top-3 z-10" />
    </div>
  )
}
