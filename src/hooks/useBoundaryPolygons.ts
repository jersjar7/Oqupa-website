import { useEffect, useRef, useCallback, useState } from 'react'
import { useMap, useMapsLibrary } from '@vis.gl/react-google-maps'
import { BOUNDARY_LAYERS } from '@/lib/constants'
import type { MultiPolygon, Polygon, FeatureCollection } from 'geojson'

// Module-level cache: avoids re-fetching across navigations
const geojsonCache = new Map<string, FeatureCollection>()

/**
 * Fetches boundary GeoJSON files, renders polygons on the map,
 * and exposes an `isInsideBoundary` check.
 *
 * Must be rendered inside a `<Map>` component.
 */
export function useBoundaryPolygons(): {
  isLoaded: boolean
  isInsideBoundary: (lat: number, lng: number) => boolean
} {
  const map = useMap()
  const geometryLib = useMapsLibrary('geometry')
  const polygonsRef = useRef<google.maps.Polygon[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Fetch GeoJSON and render polygons on the map
  useEffect(() => {
    if (!map || !geometryLib) return

    let cancelled = false

    async function loadBoundaries() {
      const allPolygons: google.maps.Polygon[] = []

      for (const layer of BOUNDARY_LAYERS) {
        let geojson = geojsonCache.get(layer.url)

        if (!geojson) {
          const res = await fetch(layer.url)
          geojson = (await res.json()) as FeatureCollection
          geojsonCache.set(layer.url, geojson)
        }

        if (cancelled) return

        for (const feature of geojson.features) {
          const geometry = feature.geometry as Polygon | MultiPolygon

          const rings =
            geometry.type === 'MultiPolygon'
              ? geometry.coordinates.flat()
              : geometry.coordinates

          for (const ring of rings) {
            const paths = ring.map(
              (coord) =>
                new google.maps.LatLng(coord[1] as number, coord[0] as number),
            )

            const polygon = new google.maps.Polygon({
              paths,
              fillColor: layer.fillColor,
              fillOpacity: layer.fillOpacity,
              strokeColor: layer.strokeColor,
              strokeWeight: layer.strokeWeight,
              zIndex: layer.zIndex,
              clickable: false,
              map,
            })

            allPolygons.push(polygon)
          }
        }
      }

      if (!cancelled) {
        polygonsRef.current = allPolygons
        setIsLoaded(true)
      }
    }

    loadBoundaries()

    return () => {
      cancelled = true
      polygonsRef.current.forEach((p) => p.setMap(null))
      polygonsRef.current = []
    }
  }, [map, geometryLib])

  const isInsideBoundary = useCallback(
    (lat: number, lng: number): boolean => {
      // Permissive default: allow placement while boundaries are loading
      if (!geometryLib || polygonsRef.current.length === 0) return true

      const point = new google.maps.LatLng(lat, lng)
      return polygonsRef.current.some((polygon) =>
        google.maps.geometry.poly.containsLocation(point, polygon),
      )
    },
    [geometryLib],
  )

  return { isLoaded, isInsideBoundary }
}
