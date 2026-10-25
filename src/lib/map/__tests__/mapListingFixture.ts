// One listing for the map tests (map plan steps 2–4, ADR-031). Mirrors the
// app's test/helpers/list_listing_fixture.dart: only the fields the map and the
// list read are meaningful.
import type { ListingWithProperty } from '@/types/explore'
import type { Currency, OperationType, PropertyType, RentalDurationType } from '@/types/enums'

export interface FixtureOptions {
  id?: string
  type?: PropertyType
  operation?: OperationType
  rental?: RentalDurationType
  amount?: number
  currency?: Currency
  area?: number
  bedrooms?: number
  bathrooms?: number
  distrito?: string
  provincia?: string
  urbanizacion?: string
  lat?: number
  lng?: number
  exact?: boolean
  boosted?: boolean
  boostScore?: number
  publishedAt?: Date
  photos?: number
}

export function mapListing(o: FixtureOptions = {}): ListingWithProperty {
  const lat = o.lat ?? -5.1945
  const lng = o.lng ?? -80.6328
  const exact = o.exact ?? true
  const operation = o.operation ?? 'venta'
  const photos = Array.from({ length: o.photos ?? 0 }, (_, i) => `property-photos/x/${i}.webp`)
  return {
    listing: {
      id: o.id ?? 'l1',
      role: 'owner',
      ownerId: 'owner-1',
      propertyId: `p-${o.id ?? 'l1'}`,
      description: '',
      operationType: operation,
      price: { amount: o.amount ?? 98000, currency: o.currency ?? 'USD' },
      status: 'active',
      viewCount: 0,
      contactClickCount: 0,
      createdAt: new Date('2026-10-01T00:00:00Z'),
      publishedAt: o.publishedAt,
      updatedAt: new Date('2026-10-01T00:00:00Z'),
      media: { propertyPhotoUrls: [], photoKeys: photos },
      wantsRealtorHelp: false,
      maxRealtors: 1,
      currentClaimsCount: 0,
      isBoosted: o.boosted ?? false,
      boostScore: o.boostScore ?? 1,
      showExactLocation: exact,
      displayLatitude: exact ? undefined : lat,
      displayLongitude: exact ? undefined : lng,
    },
    property: {
      id: `p-${o.id ?? 'l1'}`,
      listedByUserId: 'owner-1',
      propertyType: o.type ?? 'casa',
      operationType: operation,
      rentalDurationType: o.rental,
      specs: {
        totalAreaInSquareMeters: o.area ?? 120,
        bedroomCount: o.bedrooms,
        bathroomCount: o.bathrooms,
        availableParkingSpaces: 0,
        propertyAmenities: [],
      },
      location: {
        latitude: lat,
        longitude: lng,
        calle: '',
        urbanizacion: o.urbanizacion ?? '',
        distrito: o.distrito ?? 'Piura',
        provincia: o.provincia ?? 'Piura',
        departamento: 'Piura',
        countryIsoCode: 'PE',
      },
      currentPrice: { amount: o.amount ?? 98000, currency: o.currency ?? 'USD' },
      normalizedAddress: '',
      media: { propertyPhotoUrls: [], photoKeys: photos },
      updatedAt: new Date('2026-10-01T00:00:00Z'),
      isAvailable: true,
    },
  }
}
