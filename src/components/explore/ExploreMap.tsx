// The explore map — Mapbox, the same map the app uses (map plan step 4,
// ADR-031; the app moved in July, ADR-012). Style A (ADR-031 items 15–18): far
// out a small dot per listing with its type drawing; closer in a white pin per
// listing with the drawing, the type in words and the price, or a word group
// ("5 aquí") where pins would overlap. Boosted listings are always their bigger
// photo pin.
//
// What to draw is decided by MapMarkerIndex (pure, tested); this component only
// owns the Mapbox map, its DOM markers and the camera.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { PIURA_CENTER } from '@/lib/constants'
import { MapMarkerIndex, type MapMarker } from '@/lib/map/mapMarkers'
import { DOT_TAP_ZOOM } from '@/lib/map/zoomPolicy'
import type { Bounds } from '@/lib/map/mapPoint'
import { createPinElement, createBoostedPinElement, createGroupElement, createDotElement } from './mapbox/pinElements'
import { addDepartamentoBorder, setPrivacyCircle } from './mapbox/mapLayers'
import { loadMapboxCamera, saveMapboxCamera, MAPBOX_DEFAULT_ZOOM, MAPBOX_FOCUS_ZOOM } from './mapbox/mapCamera'
import { CardContent } from './PreviewCardContent'
import HoverPreviewCard from './HoverPreviewCard'
import type { ListingWithProperty } from '@/types/explore'

export const MAPBOX_STYLE = 'mapbox://styles/mapbox/standard'
const TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined) ?? ''

export interface ExploreMapProps {
  items: ListingWithProperty[]
  selectedId: string | null
  hoveredId: string | null
  onSelect: (id: string | null) => void
  onHover: (id: string | null) => void
  onBoundsChanged?: (bounds: Bounds, zoom: number) => void
  initialCenter?: { lat: number; lng: number }
  showPreviewCard: boolean
  isVenta: boolean
}

interface LiveMarker { key: string; marker: mapboxgl.Marker; el: HTMLElement }

export default function ExploreMap(props: ExploreMapProps) {
  if (!TOKEN) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-cream p-6 text-center text-sm text-text-secondary">
        El mapa no está disponible en este momento. Intenta de nuevo más tarde.
      </div>
    )
  }
  return <MapboxExploreMap {...props} />
}

function MapboxExploreMap({
  items, selectedId, hoveredId, onSelect, onHover, onBoundsChanged, initialCenter, showPreviewCard, isVenta,
}: ExploreMapProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const liveRef = useRef<Map<string, LiveMarker>>(new Map())
  const [mapReady, setMapReady] = useState(false)
  const [previewEl, setPreviewEl] = useState<HTMLElement | null>(null)

  // Latest callbacks/values for listeners registered once.
  const latest = useRef({ onSelect, onHover, onBoundsChanged, selectedId, isVenta })
  latest.current = { onSelect, onHover, onBoundsChanged, selectedId, isVenta }

  const index = useMemo(() => new MapMarkerIndex(items), [items])
  const indexRef = useRef(index)
  indexRef.current = index

  // --- the map, created once -------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return
    mapboxgl.accessToken = TOKEN
    const saved = loadMapboxCamera()
    const start = initialCenter
      ? { center: initialCenter, zoom: MAPBOX_FOCUS_ZOOM }
      : saved
        ? { center: { lat: saved.lat, lng: saved.lng }, zoom: saved.zoom }
        : { center: PIURA_CENTER, zoom: MAPBOX_DEFAULT_ZOOM }
    if (initialCenter) saveMapboxCamera(initialCenter.lat, initialCenter.lng, MAPBOX_FOCUS_ZOOM)

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [start.center.lng, start.center.lat],
      zoom: start.zoom,
      attributionControl: true,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map

    const reportBounds = () => {
      const b = map.getBounds()
      if (!b) return
      latest.current.onBoundsChanged?.(
        { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() },
        map.getZoom(),
      )
      const c = map.getCenter()
      saveMapboxCamera(c.lat, c.lng, map.getZoom())
    }
    map.on('load', () => {
      addDepartamentoBorder(map)
      setMapReady(true)
      reportBounds()
    })
    map.on('moveend', reportBounds)
    map.on('click', () => latest.current.onSelect(null))

    return () => {
      for (const live of liveRef.current.values()) live.marker.remove()
      liveRef.current.clear()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- markers: redrawn on every camera move and when the data changes --------
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    let frame = 0
    const draw = () => {
      frame = 0
      const b = map.getBounds()
      if (!b) return
      const wanted = indexRef.current.markersFor(
        { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() },
        map.getZoom(),
        latest.current.selectedId,
      )
      reconcile(map, wanted)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw)
    }
    draw()
    map.on('move', schedule)
    return () => {
      map.off('move', schedule)
      if (frame) cancelAnimationFrame(frame)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, index, selectedId, isVenta])

  function reconcile(map: mapboxgl.Map, wanted: MapMarker[]) {
    const live = liveRef.current
    const keep = new Set<string>()
    for (const m of wanted) {
      const key = keyOf(m, latest.current.selectedId, latest.current.isVenta)
      keep.add(key)
      let entry = live.get(key)
      if (!entry) {
        const el = elementFor(map, m)
        const marker = new mapboxgl.Marker({ element: el, anchor: m.kind === 'dot' ? 'center' : 'bottom' })
          .setLngLat([m.lng, m.lat])
          .addTo(map)
        // Boosted pins sit above everything else; the selected one above them.
        if (m.kind === 'pin' && m.item.listing.isBoosted) el.style.zIndex = '2'
        if (m.kind === 'pin' && m.item.listing.id === latest.current.selectedId) el.style.zIndex = '3'
        entry = { key, marker, el }
        live.set(key, entry)
      } else {
        entry.marker.setLngLat([m.lng, m.lat])
      }
    }
    for (const [key, entry] of live) {
      if (!keep.has(key)) {
        entry.marker.remove()
        live.delete(key)
      }
    }
  }

  function elementFor(map: mapboxgl.Map, m: MapMarker): HTMLElement {
    if (m.kind === 'pin') {
      const id = m.item.listing.id
      const selected = id === latest.current.selectedId
      const el = m.item.listing.isBoosted
        ? createBoostedPinElement(m.item, { selected })
        : createPinElement(m.item, { selected })
      el.dataset.markerId = id
      el.addEventListener('click', (e) => {
        e.stopPropagation()
        latest.current.onSelect(id)
      })
      el.addEventListener('mouseenter', () => latest.current.onHover(id))
      el.addEventListener('mouseleave', () => latest.current.onHover(null))
      return el
    }
    if (m.kind === 'dot') {
      // Out here a finger covers several dots, so a tap zooms in rather than
      // opening one listing (same as the app).
      return createDotElement(m.item, () => map.easeTo({ center: [m.lng, m.lat], zoom: DOT_TAP_ZOOM }))
    }
    return createGroupElement(m.count, latest.current.isVenta, () =>
      map.easeTo({ center: [m.lng, m.lat], zoom: Math.min(m.expansionZoom, 19) }),
    )
  }

  // --- the selected listing: privacy circle + (computer) pinned preview -------
  const selectedItem = useMemo(() => items.find((i) => i.listing.id === selectedId) ?? null, [items, selectedId])
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    setPrivacyCircle(map, selectedItem && selectedItem.listing.showExactLocation === false ? selectedItem : null)
  }, [mapReady, selectedItem])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || !showPreviewCard || !selectedItem) {
      setPreviewEl(null)
      return
    }
    const el = document.createElement('div')
    el.style.paddingBottom = '56px'
    const lat = selectedItem.listing.displayLatitude ?? selectedItem.property.location.latitude
    const lng = selectedItem.listing.displayLongitude ?? selectedItem.property.location.longitude
    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(map)
    setPreviewEl(el)
    return () => {
      marker.remove()
      setPreviewEl(null)
    }
  }, [mapReady, showPreviewCard, selectedItem])

  const hoveredItem = useMemo(
    () => (selectedId || !hoveredId ? null : items.find((i) => i.listing.id === hoveredId) ?? null),
    [items, hoveredId, selectedId],
  )

  return (
    <>
      <div ref={containerRef} className="h-full w-full" data-testid="explore-map" />
      {previewEl && selectedItem &&
        createPortal(
          <div
            role="button"
            tabIndex={0}
            aria-label="Ver detalles de la propiedad"
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/property/${selectedItem.listing.id}`)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate(`/property/${selectedItem.listing.id}`)
              }
            }}
          >
            <CardContent item={selectedItem} />
          </div>,
          previewEl,
        )}
      {showPreviewCard && <HoverPreviewCard item={hoveredItem} onHover={onHover} />}
    </>
  )
}

function keyOf(m: MapMarker, selectedId: string | null, isVenta: boolean): string {
  const mode = isVenta ? 'v' : 'a'
  if (m.kind === 'pin') {
    const l = m.item.listing
    return `pin:${l.id}:${l.id === selectedId ? 's' : ''}:${l.price.amount}:${l.price.currency}:${l.isBoosted ? 'b' : ''}:${mode}`
  }
  if (m.kind === 'dot') return `dot:${m.item.listing.id}:${m.item.property.propertyType}:${mode}`
  return `group:${m.id}:${m.count}:${mode}`
}
