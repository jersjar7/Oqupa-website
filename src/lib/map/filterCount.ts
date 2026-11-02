// How many filters are on, for the Filtros buttons (UX review 2026-10-25).
// Venta/Alquiler always has a value and is shown on its own, so it is not
// counted here.
import type { MapFilters } from '@/types/explore'

export function activeFilterCount(f: MapFilters): number {
  return f.propertyTypes.length + (f.priceMin != null ? 1 : 0) + (f.priceMax != null ? 1 : 0) + (f.rentalDurationType ? 1 : 0)
}

/** The button that closes the filters, with how many listings they leave
 *  (2026-10-25; replaced the "8 de 19 propiedades" line, which had nothing to
 *  tap). Shown in capitals by the button's style. */
export function filtersDoneLabel(count: number, isVenta: boolean): string {
  return `Listo · ${count} en ${isVenta ? 'venta' : 'alquiler'}`
}

/** "Limpiar": every filter off; Venta/Alquiler and the price currency stay. */
export function clearedFilters(f: MapFilters): MapFilters {
  return { ...f, rentalDurationType: null, propertyTypes: [], priceMin: null, priceMax: null }
}

/** Both bounds typed and the minimum above the maximum: the price filter is
 *  ignored and the panel says so (review 2026-11-02). */
export function priceRangeInvalid(f: Pick<MapFilters, 'priceMin' | 'priceMax'>): boolean {
  return f.priceMin != null && f.priceMax != null && f.priceMin > f.priceMax
}
