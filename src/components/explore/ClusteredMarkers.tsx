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

export default function ClusteredMarkers({
  items,
  selectedId,
  onSelect,
}: ClusteredMarkersProps) {
  const map = useMap()
  const markerLib = useMapsLibrary('marker')
  const clustererRef = useRef<MarkerClusterer | null>(null)
  const markersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map())
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

        const content = document.createElement('div')
        content.className = id === selectedId ? STYLE_SELECTED : STYLE_DEFAULT
        content.textContent = label

        const marker = new markerLib.AdvancedMarkerElement({
          position: {
            lat: property.location.latitude,
            lng: property.location.longitude,
          },
          content,
        })

        marker.addListener('click', () => {
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
  }, [map, markerLib, items, selectedId])

  // Update selected marker styling
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      const el = marker.content as HTMLElement
      if (!el) continue
      el.className = id === selectedId ? STYLE_SELECTED : STYLE_DEFAULT
    }
  }, [selectedId])

  return null
}
