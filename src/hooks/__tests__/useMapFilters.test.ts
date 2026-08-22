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

  describe('visible — viewport bounds', () => {
    // A small box over central Piura. In the southern/western hemisphere both
    // axes are negative: north > south (less negative), east > west (less negative).
    const BOUNDS = { north: -5.1, south: -5.3, east: -80.5, west: -80.7 }

    it('equals filtered when no bounds are provided', () => {
      const items = [item(), item(), item()]

      const { result } = renderHook(() => useMapFilters(items, NO_FILTERS, null))

      expect(result.current.visible).toEqual(result.current.filtered)
    })

    it('includes an item whose coordinates fall inside the bounds', () => {
      const inside = item({ lat: -5.2, lng: -80.6 })

      const { result } = renderHook(() => useMapFilters([inside], NO_FILTERS, BOUNDS))

      expect(result.current.visible).toHaveLength(1)
    })

    it('excludes an item north of the viewport', () => {
      const tooFarNorth = item({ lat: -5.0, lng: -80.6 })

      const { result } = renderHook(() => useMapFilters([tooFarNorth], NO_FILTERS, BOUNDS))

      expect(result.current.visible).toHaveLength(0)
    })

    it('excludes an item south of the viewport', () => {
      const tooFarSouth = item({ lat: -5.4, lng: -80.6 })

      const { result } = renderHook(() => useMapFilters([tooFarSouth], NO_FILTERS, BOUNDS))

      expect(result.current.visible).toHaveLength(0)
    })

    it('excludes an item east of the viewport', () => {
      const tooFarEast = item({ lat: -5.2, lng: -80.4 })

      const { result } = renderHook(() => useMapFilters([tooFarEast], NO_FILTERS, BOUNDS))

      expect(result.current.visible).toHaveLength(0)
    })

    it('excludes an item west of the viewport', () => {
      const tooFarWest = item({ lat: -5.2, lng: -80.8 })

      const { result } = renderHook(() => useMapFilters([tooFarWest], NO_FILTERS, BOUNDS))

      expect(result.current.visible).toHaveLength(0)
    })

    it('includes an item sitting exactly on a boundary edge', () => {
      const onNorthEdge = item({ lat: -5.1, lng: -80.6 })

      const { result } = renderHook(() => useMapFilters([onNorthEdge], NO_FILTERS, BOUNDS))

      expect(result.current.visible).toHaveLength(1)
    })
  })

  describe('visible — coordinate source', () => {
    const BOUNDS = { north: -5.1, south: -5.3, east: -80.5, west: -80.7 }

    it('uses displayLatitude/displayLongitude when present, ignoring the real property coordinates', () => {
      // Property sits well outside the viewport; the display pin is inside it.
      // This is the privacy feature: hidden-address listings show an approximate
      // pin so buyers can see the area without pinpointing the exact address.
      // If the hook used the real coordinates instead, this listing would vanish
      // from the map — the bug that hid 7 of 36 listings on 2026-08-06.
      const hidden = item({
        lat: -6.0, lng: -81.0,           // real location — outside BOUNDS
        displayLat: -5.2, displayLng: -80.6, // display pin — inside BOUNDS
      })

      const { result } = renderHook(() => useMapFilters([hidden], NO_FILTERS, BOUNDS))

      expect(result.current.visible).toHaveLength(1)
    })

    it('falls back to property.location coordinates when displayLatitude is absent', () => {
      // Normal listing with no display pin override: the real coordinates are used.
      const normal = item({
        lat: -5.2, lng: -80.6,       // real location — inside BOUNDS
        displayLat: undefined, displayLng: undefined,
      })

      const { result } = renderHook(() => useMapFilters([normal], NO_FILTERS, BOUNDS))

      expect(result.current.visible).toHaveLength(1)
    })
  })

  describe('total', () => {
    it('always reflects the full item count regardless of active filters', () => {
      const items = [
        item({ propertyType: 'casa',         price: 100_000 }),
        item({ propertyType: 'departamento', price: 200_000 }),
        item({ propertyType: 'terreno',      price: 300_000 }),
        item({ propertyType: 'oficina',      price: 400_000 }),
        item({ propertyType: 'local',        price: 500_000 }),
      ]
      // Filters that keep only one item — total must still report 5.
      const filters: MapFilters = { ...NO_FILTERS, propertyTypes: ['casa'], priceMax: 150_000 }

      const { result } = renderHook(() => useMapFilters(items, filters))

      expect(result.current.filtered).toHaveLength(1)
      expect(result.current.total).toBe(5)
    })
  })
})
