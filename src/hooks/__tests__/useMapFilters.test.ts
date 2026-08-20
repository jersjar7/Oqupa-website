// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useMapFilters } from '../useMapFilters'
import type { ListingWithProperty, MapFilters } from '@/types/explore'

// ── Fixtures ─────────────────────────────────────────────────────────────────
//
// useMapFilters reads only six fields across the two objects. The full
// Listing and Property shapes have ~30 fields each; rather than populate
// every required field, we cast through unknown so the test fixtures can
// stay focused on the fields that actually drive the filtering logic.

interface ItemOverrides {
  propertyType?: string
  rentalDurationType?: string
  price?: number
  lat?: number
  lng?: number
  displayLat?: number | undefined
  displayLng?: number | undefined
}

function item(overrides: ItemOverrides = {}): ListingWithProperty {
  return {
    listing: {
      price: { amount: overrides.price ?? 100_000, currency: 'PEN' },
      displayLatitude: overrides.displayLat,
      displayLongitude: overrides.displayLng,
    },
    property: {
      propertyType: overrides.propertyType ?? 'casa',
      rentalDurationType: overrides.rentalDurationType,
      location: {
        latitude: overrides.lat ?? -5.2,
        longitude: overrides.lng ?? -80.6,
      },
    },
  } as unknown as ListingWithProperty
}

// All filters in their "off" state — matches everything.
const NO_FILTERS: MapFilters = {
  operationType: null,
  rentalDurationType: null,
  propertyTypes: [],
  priceMin: null,
  priceMax: null,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useMapFilters', () => {
  describe('filtered — no active filters', () => {
    it('returns all items when no filters are set', () => {
      const items = [
        item({ propertyType: 'casa', price: 200_000 }),
        item({ propertyType: 'departamento', price: 350_000 }),
        item({ propertyType: 'terreno', price: 80_000 }),
      ]

      const { result } = renderHook(() => useMapFilters(items, NO_FILTERS))

      expect(result.current.filtered).toHaveLength(3)
      expect(result.current.filtered).toEqual(items)
    })
  })
})
