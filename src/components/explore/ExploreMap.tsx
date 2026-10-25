// The explore map — Mapbox, the same map the app uses (map plan step 4,
// ADR-031; the app moved in July, ADR-012). Style A (ADR-031 items 15–18): far
// out a small dot per listing with its type drawing; closer in a white pin per
// listing with the drawing, the type in words and the price, or a word group
// ("5 aquí") where pins would overlap. Boosted listings are the same size and
// never grouped: far out a gold-edged dot, closer a gold-edged pin with photo.
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
import { showsDots } from '@/lib/map/zoomPolicy'
import type { Bounds } from '@/lib/map/mapPoint'
import { cardSide, panToReveal, MAP_CARD_Z } from '@/lib/map/mapView'
import { createPinElement, createBoostedPinElement, createGroupElement, createDotElement, createRaisedPinElement, createRaisedAnchorElement } from './mapbox/pinElements'
import { addDepartamentoBorder, setPrivacyCircle } from './mapbox/mapLayers'
import { loadMapboxCamera, saveMapboxCamera, MAPBOX_DEFAULT_ZOOM, MAPBOX_FOCUS_ZOOM } from './mapbox/mapCamera'
import CompactListingCard from './CompactListingCard'
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
  /** A shared "N aquí" pin (listings at the identical point) was clicked:
   *  list exactly those. */
  onOpenSpot?: (items: ListingWithProperty[]) => void
  /** A listing pointed at in the list beside the map (computer): its pin
   *  takes the selected look and comes to the front, so it can be found. */
  emphasizedId?: string | null
  /** Phone: how much of the bottom of the screen the listing card and the
   *  VER LISTA button cover (px), so a chosen listing hidden there is brought
   *  into view. 0 when nothing covers it. */
  coveredBottom?: number
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
  items, selectedId, hoveredId, onSelect, onHover, onBoundsChanged, initialCenter, showPreviewCard, isVenta, onOpenSpot,
  emphasizedId = null, coveredBottom = 0,
}: ExploreMapProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const liveRef = useRef<Map<string, LiveMarker>>(new Map())
  const [mapReady, setMapReady] = useState(false)
  const [previewEl, setPreviewEl] = useState<HTMLElement | null>(null)
  // The far-out dot whose pin is raised on a leader line (ADR-033).
  const [raisedId, setRaisedId] = useState<string | null>(null)

  // Latest callbacks/values for listeners registered once.
  const latest = useRef({ onSelect, onHover, onBoundsChanged, selectedId, isVenta, showPreviewCard, onOpenSpot, raisedId, emphasizedId })
  latest.current = { onSelect, onHover, onBoundsChanged, selectedId, isVenta, showPreviewCard, onOpenSpot, raisedId, emphasizedId }

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
    // + / − only on a computer: on a phone, pinching does it (UX review
    // 2026-10-25).
    if (window.matchMedia?.('(min-width: 768px)').matches) {
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    }
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
    // The map keeps the size its box had when it started. Seen 2026-10-24 on
    // staging at 1440×900: the box grew to 769 px after start-up and the map
    // stayed 300 px tall, the rest blank, until the window was resized. Fit
    // it again once loaded and whenever the box changes.
    const container = containerRef.current
    const refit = new ResizeObserver(() => map.resize())
    refit.observe(container)
    // No business, transit or landmark names on the base map: they compete
    // with the dots (Jerson, 2026-10-25, ADR-033 — like Redfin; the app
    // already hid them). Streets and neighbourhoods stay.
    map.on('style.load', () => {
      for (const key of ['showPointOfInterestLabels', 'showTransitLabels', 'showLandmarkIcons', 'showLandmarkIconLabels']) {
        try {
          map.setConfigProperty('basemap', key, false)
        } catch {
          /* a key this style version lacks */
        }
      }
    })
    map.on('load', () => {
      map.resize()
      addDepartamentoBorder(map)
      setMapReady(true)
      reportBounds()
    })
    map.on('moveend', reportBounds)
    map.on('click', () => {
      // A raised pin drops back into its dot (ADR-033).
      setRaisedId(null)
      latest.current.onSelect(null)
    })

    return () => {
      refit.disconnect()
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
      // Close in every listing is already its own pin.
      if (latest.current.raisedId && !showsDots(map.getZoom())) setRaisedId(null)
      const wanted = indexRef.current.markersFor(
        { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() },
        map.getZoom(),
        latest.current.selectedId,
        latest.current.raisedId,
        latest.current.emphasizedId,
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
  }, [mapReady, index, selectedId, isVenta, raisedId, emphasizedId])

  function reconcile(map: mapboxgl.Map, wanted: MapMarker[]) {
    const live = liveRef.current
    const keep = new Set<string>()
    for (const m of wanted) {
      const key = keyOf(m, latest.current.selectedId, latest.current.isVenta, latest.current.emphasizedId)
      keep.add(key)
      let entry = live.get(key)
      if (!entry) {
        const el = elementFor(m)
        const marker = new mapboxgl.Marker({ element: el, anchor: m.kind === 'dot' || m.kind === 'anchor' ? 'center' : 'bottom' })
          .setLngLat([m.lng, m.lat])
          .addTo(map)
        // Boosted markers sit above everything else; the selected one above them.
        if (m.kind !== 'group' && m.item.listing.isBoosted) el.style.zIndex = '2'
        if (m.kind === 'raised' || m.kind === 'anchor') el.style.zIndex = '4'
        if (m.kind === 'pin' && (m.item.listing.id === latest.current.selectedId || m.item.listing.id === latest.current.emphasizedId)) el.style.zIndex = '3'
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

  function elementFor(m: MapMarker): HTMLElement {
    if (m.kind === 'pin') {
      const id = m.item.listing.id
      const selected = id === latest.current.selectedId || id === latest.current.emphasizedId
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
      // Out here a finger covers several dots, so a tap raises the pin of the
      // one it landed on rather than opening it; the map does not move
      // (ADR-033, same as the app).
      return createDotElement(m.item, () => setRaisedId(m.item.listing.id))
    }
    if (m.kind === 'raised' || m.kind === 'anchor') {
      const id = m.item.listing.id
      const open = () => {
        setRaisedId(null)
        latest.current.onSelect(id)
      }
      return m.kind === 'raised' ? createRaisedPinElement(m.item, open) : createRaisedAnchorElement(m.item, open)
    }
    // A shared pin: listings at the identical point, which no zoom can split
    // (ADR-032). A click lists exactly those.
    return createGroupElement(m.count, latest.current.isVenta, () => {
      latest.current.onOpenSpot?.(m.items)
    })
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
    const lat = selectedItem.listing.displayLatitude ?? selectedItem.property.location.latitude
    const lng = selectedItem.listing.displayLongitude ?? selectedItem.property.location.longitude
    // Above the pin, or below it when the pin is too close to the top of the
    // map for the card to fit (it was cut off there — UX review 2026-10-25).
    const box = map.getContainer().getBoundingClientRect()
    const pinTop = box.top + map.project([lng, lat]).y - 45
    const side = cardSide({ pinTop, mapTop: box.top })
    if (side === 'above') el.style.paddingBottom = '56px'
    else el.style.paddingTop = '12px'
    const marker = new mapboxgl.Marker({ element: el, anchor: side === 'above' ? 'bottom' : 'top' }).setLngLat([lng, lat]).addTo(map)
    // Above every pin (one lit up from the list is 3), below the filters.
    marker.getElement().style.zIndex = String(MAP_CARD_Z)
    setPreviewEl(el)
    return () => {
      marker.remove()
      setPreviewEl(null)
    }
  }, [mapReady, showPreviewCard, selectedItem])

  // Phone: a listing just chosen can sit under the card at the bottom (or the
  // VER LISTA button above it). Bring it into view — only when it is hidden,
  // and without changing the zoom (UX review 2026-10-25; ADR-033).
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady || showPreviewCard || !selectedItem || coveredBottom <= 0) return
    const lat = selectedItem.listing.displayLatitude ?? selectedItem.property.location.latitude
    const lng = selectedItem.listing.displayLongitude ?? selectedItem.property.location.longitude
    const box = map.getContainer().getBoundingClientRect()
    const coveredInMap = Math.max(0, box.bottom - (window.innerHeight - coveredBottom))
    // The middle of the pin, which sits above its point.
    const dy = panToReveal({ pointY: map.project([lng, lat]).y - 22, mapHeight: box.height, coveredBottom: coveredInMap })
    if (dy !== 0) map.panBy([0, dy], { duration: 300 })
  }, [mapReady, showPreviewCard, selectedItem, coveredBottom])

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
            <CompactListingCard item={selectedItem} className="w-[370px]" />
          </div>,
          previewEl,
        )}
      {showPreviewCard && <HoverPreviewCard item={hoveredItem} onHover={onHover} />}
    </>
  )
}

function keyOf(m: MapMarker, selectedId: string | null, isVenta: boolean, emphasizedId: string | null = null): string {
  const mode = isVenta ? 'v' : 'a'
  if (m.kind === 'pin') {
    const l = m.item.listing
    return `pin:${l.id}:${l.id === selectedId || l.id === emphasizedId ? 's' : ''}:${l.price.amount}:${l.price.currency}:${l.isBoosted ? 'b' : ''}:${mode}`
  }
  if (m.kind === 'raised') return `raised:${m.item.listing.id}:${mode}`
  if (m.kind === 'anchor') return `anchor:${m.item.listing.id}`
  if (m.kind === 'dot') return `dot:${m.item.listing.id}:${m.item.property.propertyType}:${m.item.listing.isBoosted ? 'b' : ''}:${mode}`
  return `group:${m.id}:${m.count}:${mode}`
}
