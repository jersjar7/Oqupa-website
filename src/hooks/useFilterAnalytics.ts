import { useEffect, useRef, useState } from 'react'
import { AnalyticsLogger, type FilterSetParams } from '@/lib/analytics'
import type { PropertyType } from '@/types/enums'
import type { MapFilters } from '@/types/explore'

/** How long the filters must stay unchanged before they count as a search. */
export const FILTER_SETTLE_MS = 1500

/**
 * The filter set as `filter_applied` reports it, or null when no filter is on.
 *
 * Venta/Alquiler alone is not a filter, as in the app. The price filter has no
 * currency on the website (it compares against `price.amount` whatever the
 * listing's currency), so a price bound puts `price` in `filter_type` but its
 * bounds are not sent: a number without a currency would be misread.
 */
function filterSetFor(filters: MapFilters): FilterSetParams | null {
  const kinds = [
    (filters.priceMin != null || filters.priceMax != null) && 'price',
    filters.propertyTypes.length > 0 && 'property_type',
    filters.rentalDurationType != null && 'rental_duration',
  ].filter((kind): kind is string => Boolean(kind))
  if (kinds.length === 0) return null
  return {
    filterType: kinds.sort().join(','),
    operationType: filters.operationType,
    propertyTypes: filters.propertyTypes.length
      ? (filters.propertyTypes as PropertyType[])
      : null,
    rentalDuration: filters.rentalDurationType,
  }
}

/**
 * Sends `filter_applied` (and `search_no_results` on zero) once the Explore
 * filters have settled.
 *
 * The website has no "Apply" button — filters change live as people type and
 * tap — so a search is the filter set that stays put for
 * {@link FILTER_SETTLE_MS} AND whose listings have finished loading
 * (`listingsReady`), so `resultCount` is the real answer, not a partial one.
 *
 * Each settled set is sent once. Panning the map or a refetch only changes the
 * count, never the set, so neither resends; a set passed through on the way
 * to another (typing "1500" passes "1" and "15") never settles at all.
 *
 * Observes only: it changes nothing the page shows, and an analytics error is
 * swallowed.
 */
export function useFilterAnalytics(
  filters: MapFilters,
  resultCount: number,
  listingsReady: boolean,
) {
  // Every field that makes a set distinct, price bounds included even though
  // they are not sent: a new bound is a new search.
  const key = JSON.stringify([
    filters.operationType,
    filters.rentalDurationType,
    [...filters.propertyTypes].sort(),
    filters.priceMin,
    filters.priceMax,
  ])
  const [settledKey, setSettledKey] = useState<string | null>(null)
  // The last settled set handled, sent or not. Settling on "no filters" in
  // between makes the same set count as a new search again.
  const handledKey = useRef<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setSettledKey(key), FILTER_SETTLE_MS)
    return () => clearTimeout(timer)
  }, [key])

  useEffect(() => {
    if (settledKey !== key || handledKey.current === key) return
    const filterSet = filterSetFor(filters)
    if (filterSet && !listingsReady) return
    handledKey.current = key
    if (!filterSet) return
    try {
      AnalyticsLogger.filterApplied({ ...filterSet, resultCount })
      if (resultCount === 0) AnalyticsLogger.searchNoResults(filterSet)
    } catch {
      // Analytics must never break the page.
    }
  }, [settledKey, key, filters, listingsReady, resultCount])
}
