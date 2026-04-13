import { useNavigate } from 'react-router-dom'
import { AdvancedMarker } from '@vis.gl/react-google-maps'
import { motion, AnimatePresence } from 'framer-motion'
import PhotoCarousel from './PhotoCarousel'
import { CURRENCY_SYMBOLS, PROPERTY_TYPE_LABELS } from '@/types/enums'
import { getPriceSuffix } from '@/lib/formatters'
import type { ListingWithProperty } from '@/types/explore'

interface MapPreviewCardProps {
  item: ListingWithProperty | null
}

export default function MapPreviewCard({ item }: MapPreviewCardProps) {
  const navigate = useNavigate()

  return (
    <AnimatePresence>
      {item && (
        <AdvancedMarker
          key={item.listing.id}
          position={{
            lat: item.listing.displayLatitude ?? item.property.location.latitude,
            lng: item.listing.displayLongitude ?? item.property.location.longitude,
          }}
          zIndex={9999}
        >
          {/*
            AdvancedMarker anchors the bottom-center of its content at the
            lat/lng position. The bottom padding creates an invisible spacer
            so the visible card clears the price bubble beneath (~35px tall).
          */}
          <div style={{ paddingBottom: 45 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                navigate(`/property/${item.listing.id}`)
              }}
            >
              <CardContent item={item} />

              {/* Triangle pointer */}
              <div className="flex justify-center">
                <div
                  className="h-0 w-0"
                  style={{
                    borderLeft: '8px solid transparent',
                    borderRight: '8px solid transparent',
                    borderTop: '8px solid white',
                  }}
                />
              </div>
            </motion.div>
          </div>
        </AdvancedMarker>
      )}
    </AnimatePresence>
  )
}

export function CardContent({ item }: { item: ListingWithProperty }) {
  const { listing, property } = item
  const photoRefs = property.media.photoKeys?.length
    ? property.media.photoKeys
    : property.media.propertyPhotoUrls
  const symbol = CURRENCY_SYMBOLS[listing.price.currency]
  const typeLabel = PROPERTY_TYPE_LABELS[property.propertyType] ?? property.propertyType
  const priceSuffix = getPriceSuffix(property.operationType, property.rentalDurationType)
  const isApproximate = listing.showExactLocation === false

  return (
    <div className="w-[280px] overflow-hidden rounded-xl bg-white shadow-large">
      {/* Photo carousel */}
      <div className="relative">
        <PhotoCarousel
          photoRefs={photoRefs}
          maxPhotos={5}
          aspectRatio="4/3"
          blurHash={property.media.photoBlurHashes?.[0]}
          microThumb={property.media.primaryPhotoMicroThumb}
        />
        {listing.isBoosted && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 text-[11px] font-semibold text-white shadow">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            Destacado
          </span>
        )}
        {isApproximate && (
          <span className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
            Ubicacion aproximada
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-base font-bold text-text-primary">
          {symbol} {listing.price.amount.toLocaleString()}
          {priceSuffix && (
            <span className="text-xs font-medium text-primary"> {priceSuffix}</span>
          )}
        </p>
        <p className="mt-0.5 text-xs font-medium text-text-secondary">
          {typeLabel} &middot; {property.location.distrito}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-text-tertiary">
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
    </div>
  )
}
