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

  describe('filtered — rentalDurationType', () => {
    it('excludes items whose rentalDurationType does not match the filter', () => {
      const longTerm  = item({ rentalDurationType: 'longTerm' })
      const shortTerm = item({ rentalDurationType: 'shortTerm' })
      const filters: MapFilters = { ...NO_FILTERS, rentalDurationType: 'longTerm' }

      const { result } = renderHook(() => useMapFilters([longTerm, shortTerm], filters))

      expect(result.current.filtered).toHaveLength(1)
      expect(result.current.filtered[0]).toBe(longTerm)
    })

    it('keeps all items when rentalDurationType filter is null', () => {
      const items = [
        item({ rentalDurationType: 'longTerm' }),
        item({ rentalDurationType: 'shortTerm' }),
      ]

      const { result } = renderHook(() => useMapFilters(items, NO_FILTERS))

      expect(result.current.filtered).toHaveLength(2)
    })
  })

  describe('filtered — propertyTypes', () => {
    it('keeps only items matching a single selected type', () => {
      const casa         = item({ propertyType: 'casa' })
      const departamento = item({ propertyType: 'departamento' })
      const terreno      = item({ propertyType: 'terreno' })
      const filters: MapFilters = { ...NO_FILTERS, propertyTypes: ['casa'] }

      const { result } = renderHook(() =>
        useMapFilters([casa, departamento, terreno], filters),
      )

      expect(result.current.filtered).toHaveLength(1)
      expect(result.current.filtered[0]).toBe(casa)
    })

    it('keeps items matching any of several selected types', () => {
      const casa         = item({ propertyType: 'casa' })
      const departamento = item({ propertyType: 'departamento' })
      const terreno      = item({ propertyType: 'terreno' })
      const filters: MapFilters = { ...NO_FILTERS, propertyTypes: ['casa', 'departamento'] }

      const { result } = renderHook(() =>
        useMapFilters([casa, departamento, terreno], filters),
      )

      expect(result.current.filtered).toHaveLength(2)
      expect(result.current.filtered).toContain(casa)
      expect(result.current.filtered).toContain(departamento)
    })

    it('keeps all items when propertyTypes array is empty', () => {
      const items = [
        item({ propertyType: 'casa' }),
        item({ propertyType: 'terreno' }),
        item({ propertyType: 'oficina' }),
      ]

      const { result } = renderHook(() => useMapFilters(items, NO_FILTERS))

      expect(result.current.filtered).toHaveLength(3)
    })
  })

  describe('filtered — priceMin', () => {
    it('excludes items whose price is below the minimum', () => {
      const cheap     = item({ price: 50_000 })
      const expensive = item({ price: 200_000 })
      const filters: MapFilters = { ...NO_FILTERS, priceMin: 100_000 }

      const { result } = renderHook(() => useMapFilters([cheap, expensive], filters))

      expect(result.current.filtered).toHaveLength(1)
      expect(result.current.filtered[0]).toBe(expensive)
    })

    it('keeps an item priced exactly at the minimum boundary', () => {
      const atBoundary = item({ price: 100_000 })
      const filters: MapFilters = { ...NO_FILTERS, priceMin: 100_000 }

      const { result } = renderHook(() => useMapFilters([atBoundary], filters))

      expect(result.current.filtered).toHaveLength(1)
    })

    it('keeps all items when priceMin is null', () => {
      const items = [item({ price: 1_000 }), item({ price: 500_000 })]

      const { result } = renderHook(() => useMapFilters(items, NO_FILTERS))

      expect(result.current.filtered).toHaveLength(2)
    })
  })

  describe('filtered — priceMax', () => {
    it('excludes items whose price is above the maximum', () => {
      const cheap     = item({ price: 50_000 })
      const expensive = item({ price: 200_000 })
      const filters: MapFilters = { ...NO_FILTERS, priceMax: 100_000 }

      const { result } = renderHook(() => useMapFilters([cheap, expensive], filters))

      expect(result.current.filtered).toHaveLength(1)
      expect(result.current.filtered[0]).toBe(cheap)
    })

    it('keeps an item priced exactly at the maximum boundary', () => {
      const atBoundary = item({ price: 100_000 })
      const filters: MapFilters = { ...NO_FILTERS, priceMax: 100_000 }

      const { result } = renderHook(() => useMapFilters([atBoundary], filters))

      expect(result.current.filtered).toHaveLength(1)
    })

    it('keeps all items when priceMax is null', () => {
      const items = [item({ price: 1_000 }), item({ price: 500_000 })]

      const { result } = renderHook(() => useMapFilters(items, NO_FILTERS))

      expect(result.current.filtered).toHaveLength(2)
    })
  })

  describe('filtered — multiple filters active', () => {
    it('applies all filters together so an item must pass every condition to appear', () => {
      // Only this item satisfies all three conditions at once.
      const match = item({ propertyType: 'casa', rentalDurationType: 'longTerm', price: 150_000 })
      // Fails propertyType.
      const wrongType = item({ propertyType: 'terreno', rentalDurationType: 'longTerm', price: 150_000 })
      // Fails rentalDurationType.
      const wrongDuration = item({ propertyType: 'casa', rentalDurationType: 'shortTerm', price: 150_000 })
      // Fails priceMin.
      const tooAffordable = item({ propertyType: 'casa', rentalDurationType: 'longTerm', price: 50_000 })

      const filters: MapFilters = {
        operationType: null,
        rentalDurationType: 'longTerm',
        propertyTypes: ['casa'],
        priceMin: 100_000,
        priceMax: null,
      }

      const { result } = renderHook(() =>
        useMapFilters([match, wrongType, wrongDuration, tooAffordable], filters),
      )

      expect(result.current.filtered).toHaveLength(1)
      expect(result.current.filtered[0]).toBe(match)
    })
  })
})
