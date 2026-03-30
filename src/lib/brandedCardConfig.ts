// Config builder for branded listing card images.
//
// Extracts all display strings from listing + property data so the
// canvas painter only needs to render — no business logic in the paint layer.
// Port of Flutter's BrandedCardConfig.fromListingWithDetails().

import {
  CURRENCY_SYMBOLS,
  PROPERTY_TYPE_SHORT_LABELS,
  RENTAL_DURATION_PRICE_SUFFIX,
} from '@/types/enums'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import type { CardFormat } from './cardLayout'

export interface BrandedCardConfig {
  format: CardFormat
  operationLabel: string    // "SE VENDE" | "SE ALQUILA"
  propertyType: string      // Short: "Apto.", "Local", etc.
  priceText: string         // "US$ 180,000" or "S/. 1,700/mes"
  specsText: string         // "3 hab. | 2 baños | 120 m²"
  locationText: string      // "San Eduardo, Piura"
  listingUrl: string        // "https://oqupa.com/property/{id}"
}

export function buildBrandedCardConfig(
  listing: Listing,
  property: Property,
  format: CardFormat,
): BrandedCardConfig {
  // Operation label in uppercase for badge
  const operationLabel =
    property.operationType === 'venta' ? 'SE VENDE' : 'SE ALQUILA'

  // Short property type name for compact card overlay
  const propertyType =
    PROPERTY_TYPE_SHORT_LABELS[property.propertyType] ?? property.propertyType

  // Formatted price with context (currency, /mes, /noche)
  const symbol = CURRENCY_SYMBOLS[listing.price.currency] ?? 'S/.'
  let priceText = `${symbol} ${listing.price.amount.toLocaleString('es-PE')}`
  if (property.operationType === 'alquiler') {
    const key = property.rentalDurationType || 'longTerm'
    const suffix = RENTAL_DURATION_PRICE_SUFFIX[key] ?? '/mes'
    priceText += suffix
  }

  // Specs line (conditional bedrooms/bathrooms)
  const specs: string[] = []
  if (property.specs.bedroomCount != null) {
    specs.push(`${property.specs.bedroomCount} hab.`)
  }
  if (property.specs.bathroomCount != null) {
    const label = property.specs.bathroomCount === 1 ? 'baño' : 'baños'
    specs.push(`${property.specs.bathroomCount} ${label}`)
  }
  specs.push(`${Math.floor(property.specs.totalAreaInSquareMeters)} m²`)

  // Location text
  const distrito = property.location.distrito
  const urbanizacion = property.location.urbanizacion
  const locationText =
    urbanizacion ? `${urbanizacion}, ${distrito}` : distrito

  // Listing URL
  const listingUrl = `https://oqupa.com/property/${listing.id}`

  return {
    format,
    operationLabel,
    propertyType,
    priceText,
    specsText: specs.join(' | '),
    locationText,
    listingUrl,
  }
}
