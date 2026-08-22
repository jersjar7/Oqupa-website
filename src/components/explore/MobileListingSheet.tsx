import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import PhotoCarousel from './PhotoCarousel'
import { CURRENCY_SYMBOLS, PROPERTY_TYPE_LABELS } from '@/types/enums'
import { getPriceSuffix } from '@/lib/formatters'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import type { ListingWithProperty } from '@/types/explore'

interface MobileListingSheetProps {
  item: ListingWithProperty | null
  onClose: () => void
}

export default function MobileListingSheet({ item, onClose }: MobileListingSheetProps) {
  const navigate = useNavigate()
  const containerRef = useFocusTrap<HTMLDivElement>(item != null)

  useEffect(() => {
    if (!item) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [item, onClose])

  return (
    <AnimatePresence>
      {item && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sheet-backdrop"
            className="fixed inset-0 z-30 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            ref={containerRef}
            key={`sheet-${item.listing.id}`}
            role="dialog"
            aria-modal="true"
            aria-label="Detalle de la propiedad"
            tabIndex={-1}
            className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl bg-white shadow-large outline-none"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose()
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="h-1 w-10 rounded-full bg-gray-300" />
            </div>

            <SheetContent item={item} onNavigate={() => navigate(`/property/${item.listing.id}`)} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function SheetContent({
  item,
  onNavigate,
}: {
  item: ListingWithProperty
  onNavigate: () => void
}) {
  const { listing, property } = item
  const photoRefs = property.media.photoKeys?.length
    ? property.media.photoKeys
    : property.media.propertyPhotoUrls
  const symbol = CURRENCY_SYMBOLS[listing.price.currency]
  const typeLabel = PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType
  const priceSuffix = getPriceSuffix(property.operationType, property.rentalDurationType)

  return (
    <div className="px-4 pb-6">
      {/* Photo carousel */}
      <div className="overflow-hidden rounded-xl">
        <PhotoCarousel
          photoRefs={photoRefs}
          maxPhotos={5}
          aspectRatio="16/9"
          showArrowsAlways
          alt={`${typeLabel} en ${property.location.distrito}`}
          blurHash={property.media.photoBlurHashes?.[0]}
          microThumb={property.media.primaryPhotoMicroThumb}
        />
      </div>

      {/* Info */}
      <div className="mt-3">
        <p className="text-lg font-bold text-text-primary">
          {symbol} {listing.price.amount.toLocaleString()}
          {priceSuffix && (
            <span className="text-sm font-medium text-primary"> {priceSuffix}</span>
          )}
        </p>
        <p className="mt-0.5 text-sm font-medium text-text-secondary">
          {typeLabel} &middot; {property.location.distrito}
        </p>
        <div className="mt-1 flex items-center gap-3 text-sm text-text-tertiary">
          {property.specs.bedroomCount != null && (
            <span>{property.specs.bedroomCount} hab.</span>
          )}
          {property.specs.bathroomCount != null && (
            <span>{property.specs.bathroomCount} baños</span>
          )}
          {property.specs.totalAreaInSquareMeters > 0 && (
            <span>{property.specs.totalAreaInSquareMeters} m²</span>
          )}
        </div>
      </div>

      {/* CTA button */}
      <button
        onClick={onNavigate}
        className="mt-4 w-full rounded-xl bg-primary py-3 text-center text-sm font-bold uppercase text-white transition-colors hover:bg-primary-hover"
      >
        Ver detalles
      </button>
    </div>
  )
}
