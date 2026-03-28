import {
  PROPERTY_TYPE_LABELS,
  OPERATION_TYPE_LABELS,
  CURRENCY_SYMBOLS,
  RENTAL_DURATION_PRICE_SUFFIX,
} from '@/types/enums'
import type { Currency, OperationType, PropertyType, RentalDurationType } from '@/types/enums'

export interface ShareListingParams {
  listingId: string
  propertyType: PropertyType
  operationType: OperationType
  rentalDurationType?: RentalDurationType
  priceAmount: number
  priceCurrency: Currency
  distrito: string
  urbanizacion?: string
  bedroomCount?: number | null
  bathroomCount?: number | null
  totalAreaInSquareMeters?: number | null
}

export function generateShareText(params: ShareListingParams): string {
  const propertyTypeLabel =
    PROPERTY_TYPE_LABELS[params.propertyType] ?? params.propertyType
  const operationLabel =
    OPERATION_TYPE_LABELS[params.operationType] ?? params.operationType
  const currencySymbol = CURRENCY_SYMBOLS[params.priceCurrency] ?? 'S/.'

  const lines: string[] = []

  // Line 1: Operation | Type en Distrito
  lines.push(`${operationLabel} | ${propertyTypeLabel} en ${params.distrito}`)

  // Line 2: Price
  let priceText = `${currencySymbol} ${params.priceAmount.toLocaleString('es-PE')}`
  if (params.operationType === 'alquiler') {
    const key = params.rentalDurationType || 'longTerm'
    const suffix = RENTAL_DURATION_PRICE_SUFFIX[key] ?? '/mes'
    priceText += ` ${suffix}`
  }
  lines.push(priceText)

  // Line 3: Specs (conditional)
  const specs: string[] = []
  if (params.bedroomCount != null) {
    specs.push(`${params.bedroomCount} hab.`)
  }
  if (params.bathroomCount != null) {
    const label = params.bathroomCount === 1 ? 'baño' : 'baños'
    specs.push(`${params.bathroomCount} ${label}`)
  }
  if (params.totalAreaInSquareMeters != null) {
    specs.push(`${Math.floor(params.totalAreaInSquareMeters)} m²`)
  }
  if (specs.length > 0) {
    lines.push(specs.join(' | '))
  }

  // Line 4: Location
  if (params.urbanizacion) {
    lines.push(`${params.urbanizacion}, ${params.distrito}`)
  } else {
    lines.push(params.distrito)
  }

  // Blank line + CTA
  lines.push('')
  lines.push('Ver en Oqupa:')
  lines.push(`https://oqupa.com/property/${params.listingId}`)

  return lines.join('\n')
}

export async function shareListing(
  params: ShareListingParams,
): Promise<'shared' | 'copied' | 'failed'> {
  const text = generateShareText(params)
  const propertyTypeLabel =
    PROPERTY_TYPE_LABELS[params.propertyType] ?? params.propertyType
  const subject = `${propertyTypeLabel} en ${params.distrito}`

  if (navigator.share) {
    try {
      await navigator.share({ title: subject, text })
      return 'shared'
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return 'failed'
      }
    }
  }

  // Fallback: copy to clipboard
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}
