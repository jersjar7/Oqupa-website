import { useCallback } from 'react'
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps'
import { PIURA_CENTER, DEFAULT_ZOOM, GOOGLE_MAP_ID } from '@/lib/constants'
import type { MapMouseEvent } from '@vis.gl/react-google-maps'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  onChange: (lat: number, lng: number) => void
}

export default function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const hasPosition = latitude != null && longitude != null
  const center = hasPosition
    ? { lat: latitude, lng: longitude }
    : PIURA_CENTER

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      const pos = e.detail.latLng
      if (pos) {
        onChange(pos.lat, pos.lng)
      }
    },
    [onChange]
  )

  const handleDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      const pos = e.latLng
      if (pos) {
        onChange(pos.lat(), pos.lng())
      }
    },
    [onChange]
  )

  return (
    <div>
      <div className="h-[300px] overflow-hidden rounded-xl border border-border">
        <APIProvider apiKey={API_KEY}>
          <Map
            defaultCenter={center}
            defaultZoom={DEFAULT_ZOOM}
            mapId={GOOGLE_MAP_ID}
            gestureHandling="greedy"
            disableDefaultUI
            onClick={handleMapClick}
            className="h-full w-full"
          >
            {hasPosition && (
              <AdvancedMarker
                position={{ lat: latitude, lng: longitude }}
                draggable
                onDragEnd={handleDragEnd}
              />
            )}
          </Map>
        </APIProvider>
      </div>
      {hasPosition && (
        <p className="mt-2 text-xs text-text-tertiary">
          Coordenadas: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      )}
    </div>
  )
}
