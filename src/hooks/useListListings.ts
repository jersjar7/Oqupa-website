import { useState, useEffect } from 'react'
import { firestoreService } from '@/services/firestoreService'
import type { ListingWithProperty } from '@/types/explore'

export function useListListings(listingIds: string[]) {
  const [items, setItems] = useState<ListingWithProperty[]>([])
  const [isLoading, setIsLoading] = useState(false)
  /** Ids that no longer resolve to a listing (deleted), after a load. */
  const [missingIds, setMissingIds] = useState<string[]>([])

  const key = listingIds.join(',')

  useEffect(() => {
    if (listingIds.length === 0) {
      setItems([])
      return
    }
    let cancelled = false
    setIsLoading(true)
    // One failed fetch no longer blanks the whole list (hostile review
    // 2026-10-25): each listing loads on its own.
    Promise.allSettled(listingIds.map((id) => firestoreService.getListingWithProperty(id)))
      .then((results) => {
        if (cancelled) return
        const found: ListingWithProperty[] = []
        const missing: string[] = []
        results.forEach((r, i) => {
          if (r.status === 'fulfilled' && r.value) found.push(r.value)
          else if (r.status === 'fulfilled') missing.push(listingIds[i]!)
        })
        setItems(found)
        setMissingIds(missing)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { items, isLoading, missingIds }
}
