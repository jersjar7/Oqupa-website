import { useEffect, useRef } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { formatShortPrice, getPriceSuffix } from '@/lib/formatters'
import type { ListingWithProperty } from '@/types/explore'

interface ClusteredMarkersProps {
  items: ListingWithProperty[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

// Base classes shared by all pill styles
const PILL_BASE =
  'cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold shadow-md transition-all'

// Background colors matching Flutter MapBubblePainter (must match pill inline bg)
const BG_VENTA = '#005B8D'
const BG_ALQUILER = '#B34E00'
const BG_SELECTED = '#059669' // emerald-600
const BG_BOOSTED = '#f59e0b' // amber-500

/** Creates a downward-pointing triangle element matching the pill color */
function createTriangle(color: string): HTMLDivElement {
  const tri = document.createElement('div')
  tri.style.width = '0'
  tri.style.height = '0'
  tri.style.borderLeft = '6px solid transparent'
  tri.style.borderRight = '6px solid transparent'
  tri.style.borderTop = `7px solid ${color}`
  tri.style.margin = '0 auto'
  tri.dataset.pedestal = 'true'
  return tri
}

/** Returns the pill background color for a given state */
function getPillBg(isBoosted: boolean, isSelected: boolean, isVenta: boolean): string {
  if (isBoosted) return BG_BOOSTED
  if (isSelected) return BG_SELECTED
  return isVenta ? BG_VENTA : BG_ALQUILER
}

export default function ClusteredMarkers({
  items,
  selectedId,
  onSelect,
}: ClusteredMarkersProps) {
  const map = useMap()
  const markerLib = useMapsLibrary('marker')
  const clustererRef = useRef<MarkerClusterer | null>(null)
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map())
  const circlesRef = useRef<google.maps.Circle[]>([])
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  // Initialize clusterer once when map is ready
  useEffect(() => {
    if (!map) return

    const clusterer = new MarkerClusterer({ map, markers: [] })
    clustererRef.current = clusterer

    return () => {
      clusterer.clearMarkers()
      clusterer.setMap(null)
      circlesRef.current.forEach((c) => c.setMap(null))
      circlesRef.current = []
    }
  }, [map])

  // Update markers when items change
  useEffect(() => {
    if (!map || !markerLib || !clustererRef.current) return

    const clusterer = clustererRef.current
    const oldMarkers = markersRef.current
    const newMarkers = new Map<string, google.maps.marker.AdvancedMarkerElement>()

    for (const item of items) {
      const id = item.listing.id
      const existing = oldMarkers.get(id)

      if (existing) {
        newMarkers.set(id, existing)
        oldMarkers.delete(id)
      } else {
        const { listing, property } = item
        const priceSuffix = getPriceSuffix(property.operationType, property.rentalDurationType)
        const label =
          formatShortPrice(listing.price.amount, listing.price.currency) +
          (priceSuffix ? ` ${priceSuffix}` : '')

        const isBoosted = listing.isBoosted
        const isSelected = id === selectedId
        const isApproximate = listing.showExactLocation === false
        const isVenta = property.operationType === 'venta'

        // Wrapper for pill + optional pedestal
        const wrapper = document.createElement('div')
        wrapper.style.display = 'flex'
        wrapper.style.flexDirection = 'column'
        wrapper.style.alignItems = 'center'
        wrapper.dataset.venta = isVenta ? '1' : ''

        // Pill with inline background color matching Flutter
        const bg = getPillBg(isBoosted, isSelected, isVenta)
        const pill = document.createElement('div')
        pill.className = isBoosted
          ? `${PILL_BASE} ring-2 ring-amber-300 ${isSelected ? 'scale-110' : 'hover:scale-105'}`
          : `${PILL_BASE} ${isSelected ? 'scale-110' : 'hover:scale-105'}`
        pill.style.backgroundColor = bg
        pill.style.color = 'white'
        pill.textContent = isBoosted ? `★ ${label}` : label
        wrapper.appendChild(pill)

        // Pedestal triangle (only for exact-location markers)
        if (!isApproximate) {
          wrapper.appendChild(createTriangle(bg))
        }

        const marker = new markerLib.AdvancedMarkerElement({
          position: {
            lat: listing.displayLatitude ?? property.location.latitude,
            lng: listing.displayLongitude ?? property.location.longitude,
          },
          content: wrapper,
        })

        marker.addEventListener('gmp-click', () => {
          onSelectRef.current(id)
        })

        newMarkers.set(id, marker)
      }
    }

    // Remove markers no longer in the data
    for (const [, oldMarker] of oldMarkers) {
      oldMarker.map = null
    }

    markersRef.current = newMarkers
    clusterer.clearMarkers()
    clusterer.addMarkers([...newMarkers.values()])

    // Update circles for approximate-location listings
    circlesRef.current.forEach((c) => c.setMap(null))
    circlesRef.current = []
    for (const item of items) {
      if (!item.listing.showExactLocation) {
        const lat = item.listing.displayLatitude ?? item.property.location.latitude
        const lng = item.listing.displayLongitude ?? item.property.location.longitude
        const circle = new google.maps.Circle({
          map,
          center: { lat, lng },
          radius: 250,
          fillColor: '#008080',
          fillOpacity: 0.06,
          strokeColor: '#008080',
          strokeOpacity: 0.15,
          strokeWeight: 1,
          clickable: false,
        })
        circlesRef.current.push(circle)
      }
    }
  }, [map, markerLib, items, selectedId])

  // Update selected marker styling
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const wrapper = marker.content as HTMLElement
      if (!wrapper) continue
      const pill = wrapper.firstElementChild as HTMLElement
      if (!pill) continue
      const isBoosted = pill.textContent?.startsWith('★') ?? false
      const isSelected = id === selectedId
      const isVenta = wrapper.dataset.venta === '1'
      const bg = getPillBg(isBoosted, isSelected, isVenta)

      pill.className = isBoosted
        ? `${PILL_BASE} ring-2 ring-amber-300 ${isSelected ? 'scale-110' : 'hover:scale-105'}`
        : `${PILL_BASE} ${isSelected ? 'scale-110' : 'hover:scale-105'}`
      pill.style.backgroundColor = bg

      // Update triangle color if present
      const tri = wrapper.querySelector('[data-pedestal]') as HTMLElement
      if (tri) {
        tri.style.borderTopColor = bg
      }
    }
  }, [selectedId])

  return null
}
