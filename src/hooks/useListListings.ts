import { useState, useEffect } from 'react'
import { firestoreService } from '@/services/firestoreService'
import type { ListingWithProperty } from '@/types/explore'

export function useListListings(listingIds: string[]) {
  const [items, setItems] = useState<ListingWithProperty[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const key = listingIds.join(',')

  useEffect(() => {
    if (listingIds.length === 0) {
      setItems([])
      return
    }
    let cancelled = false
    setIsLoading(true)
    Promise.all(listingIds.map((id) => firestoreService.getListingWithProperty(id)))
      .then((results) => {
        if (!cancelled) {
          setItems(results.filter((r): r is ListingWithProperty => r !== null))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { items, isLoading }
}
