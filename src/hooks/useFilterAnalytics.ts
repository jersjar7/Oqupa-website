import { useEffect, useRef, useState } from 'react'
import { AnalyticsLogger, type FilterSetParams } from '@/lib/analytics'
import type { PropertyType } from '@/types/enums'
import type { MapFilters } from '@/types/explore'
import { priceRangeInvalid } from '@/lib/map/filterCount'

/** How long the filters must stay unchanged before they count as a search. */
export const FILTER_SETTLE_MS = 1500

/**
 * The filter set as `filter_applied` reports it, or null when no filter is on.
 *
 * Venta/Alquiler alone is not a filter, as in the app. The price bounds are
 * sent in the currency they were typed in, with that currency, as the app
 * sends them (review 2026-11-02). A minimum above the maximum filters nothing,
 * so it is not a price filter.
 */
function filterSetFor(filters: MapFilters): FilterSetParams | null {
  const hasPrice = (filters.priceMin != null || filters.priceMax != null) && !priceRangeInvalid(filters)
  const kinds = [
    hasPrice && 'price',
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
    ...(hasPrice
      ? filters.priceCurrency === 'PEN'
        ? { minPricePen: filters.priceMin, maxPricePen: filters.priceMax, priceInputCurrency: 'PEN' as const }
        : { minPriceUsd: filters.priceMin, maxPriceUsd: filters.priceMax, priceInputCurrency: 'USD' as const }
      : {}),
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
  // Every field that makes a set distinct: a new bound or currency is a new
  // search.
  const key = JSON.stringify([
    filters.operationType,
    filters.rentalDurationType,
    [...filters.propertyTypes].sort(),
    filters.priceMin,
    filters.priceMax,
    filters.priceCurrency,
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
