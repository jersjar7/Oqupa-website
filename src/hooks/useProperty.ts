import { useState, useEffect } from 'react'
import { getListingById, getPropertyById } from '@/lib/firestore'
import type { ListingDoc, PropertyDoc } from '@/lib/firestore'

export function useProperty(propertyId: string | undefined) {
  const [listing, setListing] = useState<ListingDoc | null>(null)
  const [property, setProperty] = useState<PropertyDoc | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!propertyId) {
      setError('No se proporcionó ID de propiedad')
      setIsLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        const listingData = await getListingById(propertyId!)
        if (cancelled) return

        if (!listingData || listingData.status === 'deactivated') {
          setError('Propiedad no encontrada')
          setIsLoading(false)
          return
        }

        setListing(listingData)

        const propertyData = await getPropertyById(listingData.propertyId)
        if (cancelled) return

        if (!propertyData) {
          setError('Propiedad no encontrada')
          setIsLoading(false)
          return
        }

        setProperty(propertyData)
        setIsLoading(false)
      } catch {
        if (!cancelled) {
          setError('Error al cargar la propiedad')
          setIsLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [propertyId])

  return { listing, property, isLoading, error }
}
