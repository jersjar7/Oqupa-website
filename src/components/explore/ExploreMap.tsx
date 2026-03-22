import { useCallback, useMemo, useRef } from 'react'
import { APIProvider, Map, type MapCameraChangedEvent } from '@vis.gl/react-google-maps'
import { PIURA_CENTER, DEFAULT_ZOOM, GOOGLE_MAP_ID } from '@/lib/constants'
import ClusteredMarkers from './ClusteredMarkers'
import PropertyInfoCard from './PropertyInfoCard'
import { useBoundaryPolygons } from '@/hooks/useBoundaryPolygons'
import { useMapCameraStorage } from '@/hooks/useMapCameraStorage'
import type { ListingWithProperty } from '@/types/explore'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
const FOCUS_ZOOM = 15

interface ExploreMapProps {
  items: ListingWithProperty[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onBoundsChanged?: (bounds: google.maps.LatLngBoundsLiteral) => void
  initialCenter?: { lat: number; lng: number }
}

/** Renders boundary polygons on the map (display only). */
function BoundaryLayer() {
  useBoundaryPolygons()
  return null
}

export default function ExploreMap({ items, selectedId, onSelect, onBoundsChanged, initialCenter }: ExploreMapProps) {
  const { savedCamera, saveCamera } = useMapCameraStorage()

  // Compute initial camera once (on first render) and freeze it via useMemo
  // so uncontrolled defaultCenter/defaultZoom don't re-evaluate
  const { center, zoom, mapKey } = useMemo(() => {
    if (initialCenter) {
      return {
        center: initialCenter,
        zoom: FOCUS_ZOOM,
        mapKey: `focus-${initialCenter.lat}-${initialCenter.lng}`,
      }
    }
    if (savedCamera) {
      return {
        center: { lat: savedCamera.lat, lng: savedCamera.lng },
        zoom: savedCamera.zoom,
        mapKey: 'saved',
      }
    }
    return {
      center: PIURA_CENTER,
      zoom: DEFAULT_ZOOM,
      mapKey: 'default',
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track whether initial center was consumed so we save post-publish
  // position to localStorage too
  const didSaveInitial = useRef(false)
  if (initialCenter && !didSaveInitial.current) {
    saveCamera(initialCenter.lat, initialCenter.lng, FOCUS_ZOOM)
    didSaveInitial.current = true
  }

  const selectedItem = selectedId
    ? items.find((i) => i.listing.id === selectedId) ?? null
    : null

  const handleClose = useCallback(() => {
    onSelect(null)
  }, [onSelect])

  const handleCameraChanged = useCallback(
    (ev: MapCameraChangedEvent) => {
      onBoundsChanged?.(ev.detail.bounds)
      const { center: c, zoom: z } = ev.detail
      saveCamera(c.lat, c.lng, z)
    },
    [onBoundsChanged, saveCamera],
  )

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        key={mapKey}
        defaultCenter={center}
        defaultZoom={zoom}
        mapId={GOOGLE_MAP_ID}
        gestureHandling="greedy"
        disableDefaultUI={false}
        className="h-full w-full"
        onCameraChanged={handleCameraChanged}
      >
        <BoundaryLayer />
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
