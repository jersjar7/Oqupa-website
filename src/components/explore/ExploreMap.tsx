import { useState, useCallback } from 'react'
import { APIProvider, Map } from '@vis.gl/react-google-maps'
import { PIURA_CENTER, DEFAULT_ZOOM, GOOGLE_MAP_ID } from '@/lib/constants'
import PropertyMarker from './PropertyMarker'
import PropertyInfoCard from './PropertyInfoCard'
import type { ListingWithProperty } from '@/types/explore'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

interface ExploreMapProps {
  items: ListingWithProperty[]
}

export default function ExploreMap({ items }: ExploreMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedItem = selectedId
    ? items.find((i) => i.listing.id === selectedId) ?? null
    : null

  const handleMarkerClick = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id))
  }, [])

  const handleClose = useCallback(() => {
    setSelectedId(null)
  }, [])

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        defaultCenter={PIURA_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        mapId={GOOGLE_MAP_ID}
        gestureHandling="greedy"
        disableDefaultUI={false}
        className="h-full w-full"
      >
        {items.map((item) => (
          <PropertyMarker
            key={item.listing.id}
            item={item}
            isSelected={selectedId === item.listing.id}
            onClick={() => handleMarkerClick(item.listing.id)}
          />
        ))}

        {selectedItem && (
          <PropertyInfoCard item={selectedItem} onClose={handleClose} />
        )}
      </Map>
    </APIProvider>
  )
}
