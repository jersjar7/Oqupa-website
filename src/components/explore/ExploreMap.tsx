import { useCallback } from 'react'
import { APIProvider, Map, type MapCameraChangedEvent } from '@vis.gl/react-google-maps'
import { PIURA_CENTER, DEFAULT_ZOOM, GOOGLE_MAP_ID } from '@/lib/constants'
import ClusteredMarkers from './ClusteredMarkers'
import PropertyInfoCard from './PropertyInfoCard'
import type { ListingWithProperty } from '@/types/explore'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

interface ExploreMapProps {
  items: ListingWithProperty[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onBoundsChanged?: (bounds: google.maps.LatLngBoundsLiteral) => void
}

export default function ExploreMap({ items, selectedId, onSelect, onBoundsChanged }: ExploreMapProps) {
  const selectedItem = selectedId
    ? items.find((i) => i.listing.id === selectedId) ?? null
    : null

  const handleClose = useCallback(() => {
    onSelect(null)
  }, [onSelect])

  const handleCameraChanged = useCallback(
    (ev: MapCameraChangedEvent) => {
      onBoundsChanged?.(ev.detail.bounds)
    },
    [onBoundsChanged],
  )

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        defaultCenter={PIURA_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        mapId={GOOGLE_MAP_ID}
        gestureHandling="greedy"
        disableDefaultUI={false}
        className="h-full w-full"
        onCameraChanged={handleCameraChanged}
      >
        <ClusteredMarkers
          items={items}
          selectedId={selectedId}
          onSelect={onSelect}
        />

        {selectedItem && (
          <PropertyInfoCard item={selectedItem} onClose={handleClose} />
        )}
      </Map>
    </APIProvider>
  )
}
