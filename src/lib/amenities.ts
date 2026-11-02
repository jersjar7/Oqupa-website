// "¿Qué tiene?" (ADR-043 D12): the app's own lists, word for word
// (PropertySpecsDomainService in the app). Change them on both platforms.

export const STANDARD_AMENITIES = [
  'Piscina',
  'Jardín',
  'Balcón',
  'Terraza',
  'Aire Acondicionado',
  'Calefacción',
  'Amoblado',
  'Semi Amoblado',
  'Cocina Equipada',
  'Lavandería',
  'Portón Eléctrico',
  'Seguridad 24h',
  'Gimnasio',
  'Ascensor',
  'Intercomunicador',
  'Vista al Mar',
  'Vista a la Ciudad',
  'Cerca al Centro',
  'Transporte Público',
] as const

/** For "Alquiler por noche". */
export const SHORT_STAY_AMENITIES = [
  'WiFi',
  'Agua Caliente',
  'Desayuno Incluido',
  'Recepción 24h',
  'TV Cable',
  'Aire Acondicionado',
  'Cocina Compartida',
  'Lavandería',
  'Estacionamiento',
  'Seguridad 24h',
  'Limpieza Diaria',
  'Toallas Incluidas',
  'Ropa de Cama',
  'Cerca al Centro',
  'Transporte Público',
] as const

/** Chips shown before "Más (N)". */
export const AMENITIES_SHOWN_FIRST = 8

export function amenitySuggestions(isShortStay: boolean): readonly string[] {
  return isShortStay ? SHORT_STAY_AMENITIES : STANDARD_AMENITIES
}

export const MAX_AMENITIES = 30

/** The app's check for one more amenity typed by hand: an error, or null when it can be added. */
export function customAmenityError(text: string, chosen: readonly string[]): string | null {
  const trimmed = text.trim()
  if (!trimmed) return 'Ingresa una característica'
  if (trimmed.split(/\s+/).length > 3) return 'Máximo 3 palabras'
  if (trimmed.length > 50) return 'Máximo 50 caracteres'
  if (chosen.some((a) => a.toLowerCase() === trimmed.toLowerCase())) return 'Ya existe'
  if (chosen.length >= MAX_AMENITIES) return 'Máximo 30 características'
  return null
}
