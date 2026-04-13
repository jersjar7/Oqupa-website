import { useCallback, useEffect, useMemo, useRef } from 'react'
import { APIProvider, Map, useMap, type MapCameraChangedEvent } from '@vis.gl/react-google-maps'
import { PIURA_CENTER, DEFAULT_ZOOM, GOOGLE_MAP_ID } from '@/lib/constants'
import ClusteredMarkers from './ClusteredMarkers'
import MapPreviewCard from './MapPreviewCard'
import HoverPreviewCard from './HoverPreviewCard'
import { useBoundaryPolygons } from '@/hooks/useBoundaryPolygons'
import { useMapCameraStorage } from '@/hooks/useMapCameraStorage'
import type { ListingWithProperty } from '@/types/explore'

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string
const FOCUS_ZOOM = 15

interface ExploreMapProps {
  items: ListingWithProperty[]
  selectedId: string | null
  hoveredId: string | null
  onSelect: (id: string | null) => void
  onHover: (id: string | null) => void
  onBoundsChanged?: (bounds: google.maps.LatLngBoundsLiteral) => void
  initialCenter?: { lat: number; lng: number }
  showPreviewCard: boolean
}

/** Renders boundary polygons on the map (display only). */
function BoundaryLayer() {
  useBoundaryPolygons()
  return null
}

/**
 * Dismisses selection when clicking the map background.
 * Uses the native google.maps.Map 'click' event, which does NOT fire
 * when clicking on an AdvancedMarkerElement — only on the map surface.
 */
function MapClickDismissHandler({ onDismiss }: { onDismiss: () => void }) {
  const map = useMap()
  const callbackRef = useRef(onDismiss)
  callbackRef.current = onDismiss

  useEffect(() => {
    if (!map) return
    const listener = map.addListener('click', () => {
      callbackRef.current()
    })
    return () => listener.remove()
  }, [map])

  return null
}

export default function ExploreMap({
  items,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onBoundsChanged,
  initialCenter,
  showPreviewCard,
}: ExploreMapProps) {
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

  // Pinned preview card (AdvancedMarker inside <Map>) — click to pin
  const selectedItem = useMemo(() => {
    if (!selectedId) return null
    return items.find((i) => i.listing.id === selectedId) ?? null
  }, [items, selectedId])

  // Hover preview card (fixed-position portal) — only when nothing is pinned
  const hoveredItem = useMemo(() => {
    if (selectedId || !hoveredId) return null
    return items.find((i) => i.listing.id === hoveredId) ?? null
  }, [items, hoveredId, selectedId])

  const handleCameraChanged = useCallback(
    (ev: MapCameraChangedEvent) => {
      onBoundsChanged?.(ev.detail.bounds)
      const { center: c, zoom: z } = ev.detail
      saveCamera(c.lat, c.lng, z)
    },
    [onBoundsChanged, saveCamera],
  )

  // Dismiss is handled by MapClickDismissHandler (native Google Maps
  // 'click' event, which does not fire on AdvancedMarkerElement clicks).

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
        <MapClickDismissHandler onDismiss={() => onSelect(null)} />
        <ClusteredMarkers
          items={items}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={onSelect}
          onHover={onHover}
        />

        {showPreviewCard && (
          <MapPreviewCard item={selectedItem} />
        )}
      </Map>

      {/* Hover preview rendered outside Google Maps via portal (no flicker) */}
      {showPreviewCard && (
        <HoverPreviewCard item={hoveredItem} onHover={onHover} />
      )}
    </APIProvider>
  )
}
