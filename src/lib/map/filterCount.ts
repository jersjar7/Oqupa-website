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
