import { useCallback, useState } from 'react'
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { PIURA_CENTER, DEFAULT_ZOOM, GOOGLE_MAP_ID } from '@/lib/constants'
import { useBoundaryPolygons } from '@/hooks/useBoundaryPolygons'
import type { MapMouseEvent } from '@vis.gl/react-google-maps'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  onChange: (lat: number, lng: number) => void
}

/** Inner component rendered inside <Map> to access the map instance. */
function LocationPickerInner({
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const { isInsideBoundary } = useBoundaryPolygons()
  const [outsideBoundary, setOutsideBoundary] = useState(false)
  const hasPosition = latitude != null && longitude != null

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      const pos = e.detail.latLng
      if (!pos) return

      if (!isInsideBoundary(pos.lat, pos.lng)) {
        setOutsideBoundary(true)
        return
      }

      setOutsideBoundary(false)
      onChange(pos.lat, pos.lng)
    },
    [onChange, isInsideBoundary],
  )

  const handleDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      const pos = e.latLng
      if (!pos) return

      if (!isInsideBoundary(pos.lat(), pos.lng())) {
        setOutsideBoundary(true)
        return
      }

      setOutsideBoundary(false)
      onChange(pos.lat(), pos.lng())
    },
    [onChange, isInsideBoundary],
  )

  return (
    <>
      <div className="h-[300px] overflow-hidden rounded-xl border border-border">
        <Map
          defaultCenter={
            hasPosition ? { lat: latitude, lng: longitude } : PIURA_CENTER
          }
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
            >
              <Pin background="#F47843" borderColor="#C45D30" glyphColor="#FFFFFF" />
            </AdvancedMarker>
          )}
        </Map>
      </div>

      {outsideBoundary && (
        <p className="mt-2 text-xs text-red-600">
          Fuera de zona permitida — selecciona una ubicacion dentro del
          departamento de Piura
        </p>
      )}

      {hasPosition && !outsideBoundary && (
        <p className="mt-2 text-xs text-text-tertiary">
          Arrastra el pin o toca el mapa para ajustar la ubicacion —{' '}
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </p>
      )}
    </>
  )
}

export default function LocationPicker(props: LocationPickerProps) {
  return (
    <div>
      <APIProvider apiKey={API_KEY}>
        <LocationPickerInner {...props} />
      </APIProvider>
    </div>
  )
}
