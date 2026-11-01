import type { HiddenAddress } from '@/stores/listingFormStore'

/** Within ~1cm, the same rule the server uses (functions/lib/location-privacy.js). */
function sameCoord(a: number | null, b: number): boolean {
  return typeof a === 'number' && Math.abs(a - b) < 0.0000001
}

/**
 * The location an edit writes to the public property document.
 *
 * For a listing that hides its address, the edit form holds the TRUE address
 * (so the owner sees their own house), while the public document holds only a
 * blurred point. If the owner did not move the pin or change the street, the
 * blurred point is written back: sending the true address would publish it
 * until the server blurs it again, and every edit would draw a new blurred
 * point around the same house. A moved pin is sent as is; the server blurs it
 * (onPropertyLocationChanged).
 */
export function publicLocationOnEdit(data: {
  latitude: number | null
  longitude: number | null
  calle: string
  showExactLocation: boolean
  hiddenAddress: HiddenAddress | null
}): { latitude: number; longitude: number; calle: string } {
  const h = data.hiddenAddress
  if (
    !data.showExactLocation &&
    h &&
    sameCoord(data.latitude, h.trueLatitude) &&
    sameCoord(data.longitude, h.trueLongitude) &&
    data.calle === h.trueCalle
  ) {
    return { latitude: h.publicLatitude, longitude: h.publicLongitude, calle: '' }
  }
  return { latitude: data.latitude!, longitude: data.longitude!, calle: data.calle }
}

/**
 * The address text an edit writes next to the location (`normalizedAddress`).
 * Pass the street actually being written (publicLocationOnEdit's `calle`), so
 * a hidden address left as is carries no street. Same shape as the server's
 * (functions/lib/location-privacy.js): the parts present, comma-joined.
 */
export function normalizedAddressOnEdit(
  calle: string,
  place: { urbanizacion?: string; distrito: string; provincia: string; departamento: string },
): string {
  return [calle, place.urbanizacion, place.distrito, place.provincia, place.departamento]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join(', ')
}
