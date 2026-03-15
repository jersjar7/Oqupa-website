import { AdvancedMarker } from '@vis.gl/react-google-maps'
import { formatShortPrice, getPriceSuffix } from '@/lib/formatters'
import type { ListingWithProperty } from '@/types/explore'

interface PropertyMarkerProps {
  item: ListingWithProperty
  isSelected: boolean
  onClick: () => void
}

export default function PropertyMarker({ item, isSelected, onClick }: PropertyMarkerProps) {
  const { listing, property } = item
  const priceSuffix = getPriceSuffix(property.operationType, property.rentalDurationType)
  const label = formatShortPrice(listing.price.amount, listing.price.currency) + (priceSuffix ? ` ${priceSuffix}` : '')

  return (
    <AdvancedMarker
      position={{
        lat: property.location.latitude,
        lng: property.location.longitude,
      }}
      onClick={onClick}
    >
      <div
        className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold shadow-medium transition-all ${
          isSelected
            ? 'scale-110 bg-primary text-white'
            : 'bg-white text-text-primary hover:scale-105'
        }`}
      >
        {label}
      </div>
    </AdvancedMarker>
  )
}
