// The list of what the map shows — map plan step 3 (ADR-031 items 5 and 7–11).
// Same rules and Jerson's words as the app's map_list_logic.dart. The header
// carries the count and nothing else — no filler text.
import { findDistrict } from './peruGeography'
import { DEFAULT_PEN_PER_USD } from './exchangeRates'
import { mapPointOf, type Bounds } from './mapPoint'
import { withThousands } from './pinLabel'
import type { ListingWithProperty } from '@/types/explore'

// --- What the list contains ----------------------------------------------

/** The listings inside the visible map area — the same set the map shows,
 *  whether as pins, word groups or district cards. */
export function listingsInsideBounds(items: ListingWithProperty[], b: Bounds): ListingWithProperty[] {
  return items.filter((i) => {
    const p = mapPointOf(i)
    return p.lat >= b.south && p.lat <= b.north && p.lng >= b.west && p.lng <= b.east
  })
}

// --- Words ------------------------------------------------------------------

const operation = (isVenta: boolean) => (isVenta ? 'en venta' : 'en alquiler')

export const listButtonLabel = (count: number, isVenta: boolean) => `VER LISTA · ${count} ${operation(isVenta)}`
export const LIST_BACK_TO_MAP_LABEL = 'VER MAPA'
export const listHeader = (count: number, isVenta: boolean) => `${count} ${operation(isVenta)} aquí`
export const emptyListTitle = (isVenta: boolean) => `Aquí no hay propiedades ${operation(isVenta)}`
export const EMPTY_LIST_ZOOM_OUT_HINT = 'Vuelve al mapa y aléjalo con dos dedos para ver más lugares.'

/** "O mira las 4 en alquiler que sí hay aquí." — null when there are none. */
export function emptyListOtherOperation(count: number, otherIsVenta: boolean): string | null {
  if (count <= 0) return null
  return `O mira ${count === 1 ? 'la' : 'las'} ${count} ${operation(otherIsVenta)} que sí hay aquí.`
}

export type ListSort = 'recomendados' | 'nuevos' | 'precioAsc' | 'precioDesc' | 'masGrandes'

/** The sort options, in Jerson's words and order. */
export const LIST_SORTS: readonly { id: ListSort; label: string }[] = [
  { id: 'recomendados', label: 'Recomendados' },
  { id: 'nuevos', label: 'Nuevos en el mercado' },
  { id: 'precioAsc', label: 'Precio: de menos a más' },
  { id: 'precioDesc', label: 'Precio: de más a menos' },
  { id: 'masGrandes', label: 'Más grandes primero (m²)' },
]

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

function areaText(m2: number): string {
  return Number.isInteger(m2) ? withThousands(m2) : m2.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

/** The details that matter for this type of property. */
export function listingDetailsLine({ property }: ListingWithProperty): string {
  const area = property.specs?.totalAreaInSquareMeters ?? 0
  const areaPart = area > 0 ? `${areaText(area)} m²` : null
  switch (property.propertyType) {
    case 'terreno':
    case 'local':
    case 'oficina':
      return areaPart ?? ''
    default: {
      const beds = property.specs?.bedroomCount
      const baths = property.specs?.bathroomCount
      return [
        beds != null && beds > 0 ? count(beds, 'dormitorio', 'dormitorios') : null,
        baths != null && baths > 0 ? count(baths, 'baño', 'baños') : null,
        areaPart,
      ].filter(Boolean).join(' · ')
    }
  }
}

/** "Urb. Los Ficus, Castilla" — the urbanización when given, plus the district
 *  in its official spelling. */
export function listingLocationLine({ property }: ListingWithProperty): string {
  const loc = property.location
  const official = findDistrict(loc.distrito, loc.provincia)
  const district = official?.distrito ?? (loc.distrito ?? '').trim()
  const urb = (loc.urbanizacion ?? '').trim()
  return urb ? `${urb}, ${district}` : district
}

// --- Order -------------------------------------------------------------------

/** FNV-1a over the id mixed with the visit's seed: a stable, fair tie-break
 *  among equally boosted listings, new for every visit. Same as the app. */
function tieKey(id: string, seed: number): number {
  let h = (0x811c9dc5 ^ (seed & 0xffffffff)) >>> 0
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  h ^= h >>> 16
  h = Math.imul(h, 0x85ebca6b) >>> 0
  h ^= h >>> 13
  return h >>> 0
}

const pricePen = (i: ListingWithProperty, penPerUsd: number) =>
  i.listing.price.currency === 'USD' ? i.listing.price.amount * penPerUsd : i.listing.price.amount

const time = (d: unknown): number | null => (d instanceof Date ? d.getTime() : null)

function newestFirst(a: ListingWithProperty, b: ListingWithProperty): number {
  const pa = time(a.listing.publishedAt), pb = time(b.listing.publishedAt)
  if (pa == null && pb == null) return a.listing.id.localeCompare(b.listing.id)
  if (pa == null) return 1
  if (pb == null) return -1
  return pb - pa || a.listing.id.localeCompare(b.listing.id)
}

/** [sessionSeed] is chosen once per visit: within one visit the order never
 *  changes; across visits equally boosted listings take turns at the top
 *  (the boost is sold as "Aparece primero"). */
export function sortListingsForList(
  listings: ListingWithProperty[],
  sort: ListSort,
  sessionSeed: number,
  penPerUsd = DEFAULT_PEN_PER_USD,
): ListingWithProperty[] {
  const out = [...listings]
  switch (sort) {
    case 'recomendados':
      return out.sort((a, b) => {
        const ab = a.listing.isBoosted, bb = b.listing.isBoosted
        if (ab !== bb) return ab ? -1 : 1
        if (ab) {
          const level = (b.listing.boostScore ?? 0) - (a.listing.boostScore ?? 0)
          if (level) return level
          const t = tieKey(a.listing.id, sessionSeed) - tieKey(b.listing.id, sessionSeed)
          if (t) return t
        }
        return newestFirst(a, b)
      })
    case 'nuevos':
      return out.sort(newestFirst)
    case 'precioAsc':
    case 'precioDesc': {
      const dir = sort === 'precioAsc' ? 1 : -1
      return out.sort((a, b) => dir * (pricePen(a, penPerUsd) - pricePen(b, penPerUsd)) || newestFirst(a, b))
    }
    case 'masGrandes':
      return out.sort(
        (a, b) =>
          (b.property.specs?.totalAreaInSquareMeters ?? 0) - (a.property.specs?.totalAreaInSquareMeters ?? 0) ||
          newestFirst(a, b),
      )
  }
}
