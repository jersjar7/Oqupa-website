import { useState, useCallback } from 'react'

const STORAGE_KEY = 'oqupa-map-camera'

interface SavedCamera {
  lat: number
  lng: number
  zoom: number
}

function loadCamera(): SavedCamera | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed.lat === 'number' &&
      typeof parsed.lng === 'number' &&
      typeof parsed.zoom === 'number'
    ) {
      return parsed as SavedCamera
    }
    return null
  } catch {
    return null
  }
}

export function useMapCameraStorage() {
  const [savedCamera] = useState<SavedCamera | null>(loadCamera)

  const saveCamera = useCallback((lat: number, lng: number, zoom: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat, lng, zoom }))
    } catch {
      // Ignore quota errors
    }
  }, [])

  return { savedCamera, saveCamera }
}
