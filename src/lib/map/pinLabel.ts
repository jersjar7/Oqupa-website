// The words on a listing's map pin — map plan step 2 (ADR-031). Same rules and
// words as the app's MapPinLabel. The VENTA/ALQUILER switch already filters the
// map, so the pin says the TYPE, never "venta"/"alquiler". A terreno shows its
// size, which is the first thing a land buyer looks at.
import { formatShortPrice } from '@/lib/formatters'
import { CURRENCY_SYMBOLS, type PropertyType } from '@/types/enums'
import type { ListingWithProperty } from '@/types/explore'

export const PIN_KINDS = ['casa', 'departamento', 'terreno', 'oficina', 'local', 'alojamiento', 'cuarto'] as const
export type PinKind = (typeof PIN_KINDS)[number]

export interface PinLabel {
  kind: PinKind
  /** "CASA"; a terreno also its size: "TERRENO · 300 m²". */
  typeLine: string
  /** "US$ 98 mil", "S/. 1,200 al mes", "S/. 120 la noche". */
  priceLine: string
}

const KIND_OF: Record<PropertyType, PinKind> = {
  casa: 'casa', departamento: 'departamento', terreno: 'terreno', oficina: 'oficina',
  local: 'local', hospedaje: 'alojamiento', habitacion: 'cuarto',
}

const WORD_OF: Record<PinKind, string> = {
  casa: 'CASA', departamento: 'DEPARTAMENTO', terreno: 'TERRENO', oficina: 'OFICINA',
  local: 'LOCAL', alojamiento: 'ALOJAMIENTO', cuarto: 'CUARTO',
}

export const pinKindOf = (type: PropertyType): PinKind => KIND_OF[type] ?? 'casa'
export const pinKindWord = (kind: PinKind): string => WORD_OF[kind]

/** 1250 → "1,250" (the app's thousands style). */
export const withThousands = (n: number): string =>
  Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

export function pinLabelFor({ listing, property }: ListingWithProperty): PinLabel {
  const kind = pinKindOf(property.propertyType)
  let typeLine = pinKindWord(kind)
  const area = property.specs?.totalAreaInSquareMeters ?? 0
  if (kind === 'terreno' && area > 0) typeLine = `${typeLine} · ${withThousands(area)} m²`
  return { kind, typeLine, priceLine: priceLineOf({ listing, property }) }
}

/** Sale: the compact Spanish form ("US$ 98 mil"). Rent: the full amount, then
 *  "al mes" or "la noche" in words rather than "/mes". */
export function priceLineOf({ listing, property }: ListingWithProperty): string {
  const { amount, currency } = listing.price
  if (property.operationType !== 'alquiler') return formatShortPrice(amount, currency)
  const period = property.rentalDurationType === 'shortTerm' ? 'la noche' : 'al mes'
  return `${CURRENCY_SYMBOLS[currency]} ${withThousands(amount)} ${period}`
}
