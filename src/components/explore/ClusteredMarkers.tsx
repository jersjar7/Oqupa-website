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

const STYLE_DEFAULT =
  'cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold shadow-md bg-white text-gray-900 hover:scale-105 transition-all'
const STYLE_SELECTED =
  'cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold shadow-md scale-110 bg-emerald-600 text-white transition-all'
const STYLE_BOOSTED =
  'cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold shadow-md bg-amber-500 text-white ring-2 ring-amber-300 hover:scale-105 transition-all'
const STYLE_BOOSTED_SELECTED =
  'cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold shadow-md scale-110 bg-amber-500 text-white ring-2 ring-amber-300 transition-all'

// Background colors for the triangle pedestal (must match pill bg)
const BG_DEFAULT = '#ffffff'
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
function getPillBg(isBoosted: boolean, isSelected: boolean): string {
  if (isBoosted) return BG_BOOSTED
  return isSelected ? BG_SELECTED : BG_DEFAULT
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

        // Wrapper for pill + optional pedestal
        const wrapper = document.createElement('div')
        wrapper.style.display = 'flex'
        wrapper.style.flexDirection = 'column'
        wrapper.style.alignItems = 'center'

        // Pill
        const pill = document.createElement('div')
        pill.className = isBoosted
          ? (isSelected ? STYLE_BOOSTED_SELECTED : STYLE_BOOSTED)
          : (isSelected ? STYLE_SELECTED : STYLE_DEFAULT)
        pill.textContent = isBoosted ? `★ ${label}` : label
        wrapper.appendChild(pill)

        // Pedestal triangle (only for exact-location markers)
        if (!isApproximate) {
          wrapper.appendChild(createTriangle(getPillBg(isBoosted, isSelected)))
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
      pill.className = isBoosted
        ? (isSelected ? STYLE_BOOSTED_SELECTED : STYLE_BOOSTED)
        : (isSelected ? STYLE_SELECTED : STYLE_DEFAULT)

      // Update triangle color if present
      const tri = wrapper.querySelector('[data-pedestal]') as HTMLElement
      if (tri) {
        tri.style.borderTopColor = getPillBg(isBoosted, isSelected)
      }
    }
  }, [selectedId])

  return null
}
