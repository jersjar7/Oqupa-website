/**
 * Single source of truth for the Explore page's "no results" copy, shown in
 * both the mobile map toast and the desktop results panel. Distinguishes
 * three distinct causes so the message tells the user what to do next.
 */
export function getExploreEmptyMessage(total: number, filteredCount: number): string {
  if (total === 0) {
    return 'Estamos empezando en Piura. Pronto habrá propiedades aquí.'
  }
  if (filteredCount > 0) {
    return 'No hay propiedades en esta parte del mapa. Aléjalo con dos dedos para ver más.'
  }
  return 'No se encontraron propiedades con los filtros seleccionados.'
}

/** The map's load error, with the cause when the browser knows it. */
export function exploreLoadErrorMessage(online: boolean): string {
  return online
    ? 'No pudimos cargar las propiedades. Toca Reintentar.'
    : 'Sin conexión. Revisa tu internet y toca Reintentar.'
}
