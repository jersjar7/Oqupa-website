// The slim listing card (UX review 2026-10-25, Jerson: "use at most the screen
// real estate and be simple and modern"): a small photo on the left; the price,
// type, details and place on the right. One card for the phone (at the bottom
// of the map) and the computer (on the map, over the pin). It is only a
// picture of the listing — whoever shows it decides what a tap does (the whole
// card opens the listing in both places). Prices are written exactly as on
// the pins and in the list ("US$ 98 mil", "S/. 1,200 al mes"). A small arrow
// on the right says there is more to see, without words (Jerson, 2026-10-25:
// "well designed UI/UX does not need text explaining it").
import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { blurHashToDataUrl } from '@/lib/blurhash'
import { thumbnail } from '@/lib/imageUrl'
import { pinLabelFor, pinKindWord } from '@/lib/map/pinLabel'
import { listingDetailsLine, listingLocationLine } from '@/lib/map/listLogic'
import { drawingSvg, PIN_COLORS } from '@/components/explore/mapbox/pinElements'
import SaveButton from '@/components/lists/SaveButton'
import type { ListingWithProperty } from '@/types/explore'

export const COMPACT_CARD_PHOTO_PX = 96

export default function CompactListingCard({ item, className = '' }: { item: ListingWithProperty; className?: string }) {
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
      data-testid="compact-listing-card"
      className={`relative flex items-center gap-3 rounded-2xl bg-white p-2 pr-2 shadow-large ${
        listing.isBoosted ? 'border-2 border-amber-500' : ''
      } ${className}`}
    >
      <div
        className="relative shrink-0 overflow-hidden rounded-xl bg-background-secondary"
        style={{
          width: `${COMPACT_CARD_PHOTO_PX}px`,
          height: `${COMPACT_CARD_PHOTO_PX}px`,
          ...(placeholderUrl ? { backgroundImage: `url(${placeholderUrl})`, backgroundSize: 'cover' } : {}),
        }}
      >
        {photoRef && (
          <img src={thumbnail(photoRef)} alt={`${pinKindWord(label.kind)} en ${listingLocationLine(item)}`} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {listing.isBoosted && (
          <span className="self-start rounded bg-amber-500 px-1.5 py-px text-[10px] font-bold tracking-wide text-[#1F2937]">DESTACADO</span>
        )}
        <span className="truncate text-lg font-bold leading-tight text-text-primary">{label.priceLine}</span>
        <span className="flex items-center gap-1.5 text-xs font-bold tracking-wide" style={{ color }}>
          <span className="shrink-0" dangerouslySetInnerHTML={{ __html: drawingSvg(label.kind, 14, color).replace(/fill="#fff"/g, `fill="${color}"`).replace(/fill="currentColor"/g, 'fill="#fff"') }} />
          <span className="truncate">{pinKindWord(label.kind)}</span>
        </span>
        {details && <span className="truncate text-[13px] leading-snug text-text-secondary">{details}</span>}
        <span className="truncate text-xs leading-snug text-text-tertiary">{listingLocationLine(item)}</span>
      </div>
      <ChevronRight data-role="more-arrow" aria-hidden="true" className="mt-6 h-6 w-6 shrink-0 text-text-tertiary" strokeWidth={2.25} />
      <SaveButton listingId={listing.id} className="absolute right-2 top-2 z-10" />
    </div>
  )
}
