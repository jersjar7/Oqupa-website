// The publish form's map: tap or drag to place the pin. Mapbox, the same map as
// the explore page and the app (map plan step 4; the app moved in July,
// ADR-012). A pin outside the departamento de Piura is refused.
import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { PIURA_CENTER } from '@/lib/constants'
import { DepartamentoBorder } from '@/lib/map/departamentoBorder'
import { addDepartamentoBorder } from '@/components/explore/mapbox/mapLayers'
import { MAPBOX_DEFAULT_ZOOM } from '@/components/explore/mapbox/mapCamera'
import { pointerWords, usePointerKind } from '@/lib/pointerWords'

const MAPBOX_STYLE = 'mapbox://styles/mapbox/standard'
const TOKEN = (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined) ?? ''

interface LocationPickerProps {
  latitude: number | null
  longitude: number | null
  onChange: (lat: number, lng: number) => void
}

export default function LocationPicker(props: LocationPickerProps) {
  return <LocationPickerMap token={TOKEN} {...props} />
}

/** Exported with an explicit token so it can be tested without env vars. */
export function LocationPickerMap({ token, latitude, longitude, onChange }: LocationPickerProps & { token: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const [outsideBoundary, setOutsideBoundary] = useState(false)
  const pointer = usePointerKind()
  const latest = useRef(onChange)
  latest.current = onChange
  const hasPosition = latitude != null && longitude != null

  const tryPlace = async (lat: number, lng: number) => {
    let inside = true
    try {
      inside = (await DepartamentoBorder.load()).contains(lat, lng)
    } catch {
      // Permissive while the border can't load, as before.
    }
    if (!inside) {
      setOutsideBoundary(true)
      return
    }
    setOutsideBoundary(false)
    latest.current(lat, lng)
  }
  const tryPlaceRef = useRef(tryPlace)
  tryPlaceRef.current = tryPlace

  useEffect(() => {
    if (!token || !containerRef.current) return
    mapboxgl.accessToken = token
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: hasPosition ? [longitude!, latitude!] : [PIURA_CENTER.lng, PIURA_CENTER.lat],
      zoom: hasPosition ? 15 : MAPBOX_DEFAULT_ZOOM,
    })
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', () => addDepartamentoBorder(map))
    map.on('click', (e: mapboxgl.MapMouseEvent) => void tryPlaceRef.current(e.lngLat.lat, e.lngLat.lng))
    return () => {
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !hasPosition) return
    if (!markerRef.current) {
      const marker = new mapboxgl.Marker({ color: '#F47843', draggable: true }).setLngLat([longitude!, latitude!]).addTo(map)
      marker.on('dragend', () => {
        const ll = marker.getLngLat()
        void tryPlaceRef.current(ll.lat, ll.lng)
      })
      markerRef.current = marker
    } else {
      markerRef.current.setLngLat([longitude!, latitude!])
    }
  }, [latitude, longitude, hasPosition])

  if (!token) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-border bg-cream p-6 text-center text-sm text-text-secondary">
        El mapa no está disponible en este momento. Intenta de nuevo más tarde.
      </div>
    )
  }

  return (
    <div>
      <div ref={containerRef} className="h-[300px] overflow-hidden rounded-xl border border-border" />
      {outsideBoundary && (
        <p className="mt-2 text-xs text-red-600">
          Fuera de zona permitida — selecciona una ubicación dentro del departamento de Piura
        </p>
      )}
      {hasPosition && !outsideBoundary && (
        <p className="mt-2 text-xs text-text-tertiary">
          {pointerWords(pointer).locationPickerHint} — {latitude!.toFixed(6)}, {longitude!.toFixed(6)}
        </p>
      )}
    </div>
  )
}
