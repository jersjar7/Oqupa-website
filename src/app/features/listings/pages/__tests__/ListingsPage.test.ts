import { describe, it, expect } from 'vitest'
import { filterAsignadasAccepted, isValidTab, type Tab } from '../listingsHelpers'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'

// ── Fixtures ────────────────────────────────────────────────────────────────

function mkListing(id: string, opts: Partial<Listing> = {}): Listing {
  return {
    id,
    role: 'owner' as Listing['role'],
    ownerId: opts.ownerId ?? 'owner-1',
    propertyId: `prop-${id}`,
    description: '',
    operationType: 'venta' as Listing['operationType'],
    price: { amount: 0, currency: 'PEN' as Listing['price']['currency'] },
    status: 'active' as Listing['status'],
    viewCount: 0,
    contactClickCount: 0,
    createdAt: new Date(),
    updatedAt: new Date('2026-04-20T12:00:00Z'),
    media: { propertyPhotoUrls: [] },
    wantsRealtorHelp: true,
    maxRealtors: 5,
    currentClaimsCount: 1,
    isBoosted: false,
    boostScore: 0,
    showExactLocation: true,
    ...opts,
  } as Listing
}

function mkProperty(id: string): Property {
  return {
    id,
    listedByUserId: 'owner-1',
    propertyType: 'apartamento' as Property['propertyType'],
    operationType: 'venta' as Property['operationType'],
    specs: { bedroomCount: 2, bathroomCount: 1, totalAreaInSquareMeters: 60 } as Property['specs'],
    location: {
      latitude: 0, longitude: 0, calle: '', urbanizacion: '',
      distrito: 'Piura', provincia: 'Piura', departamento: 'Piura', countryIsoCode: 'PE',
    },
    currentPrice: { amount: 0, currency: 'PEN' as Property['currentPrice']['currency'] },
    normalizedAddress: '',
    media: { propertyPhotoUrls: [] },
    updatedAt: new Date(),
    isAvailable: true,
  }
}

function entry(listing: Listing) {
  return { listing, property: mkProperty(listing.propertyId) }
}

// ── isValidTab ──────────────────────────────────────────────────────────────

describe('isValidTab', () => {
  it('accepts the two valid tabs', () => {
    expect(isValidTab('propias')).toBe(true)
    expect(isValidTab('asignadas')).toBe(true)
  })

  it('rejects reclamadas (moved to /app/leads)', () => {
    expect(isValidTab('reclamadas')).toBe(false)
  })

  it('rejects unknown strings', () => {
    expect(isValidTab('random')).toBe(false)
    expect(isValidTab('')).toBe(false)
    expect(isValidTab('Propias')).toBe(false) // case-sensitive
  })

  it('rejects null', () => {
    expect(isValidTab(null)).toBe(false)
  })

  it('narrows the type', () => {
    const maybe = 'asignadas'
    if (isValidTab(maybe)) {
      const t: Tab = maybe
      expect(t).toBe('asignadas')
    }
  })
})

// ── filterAsignadasAccepted ─────────────────────────────────────────────────

describe('filterAsignadasAccepted', () => {
  it('returns only listings with assignmentStatus === accepted', () => {
    const input = [
      entry(mkListing('a', { assignmentStatus: 'accepted' })),
      entry(mkListing('b', { assignmentStatus: 'pending_acceptance' })),
      entry(mkListing('c', { assignmentStatus: 'accepted' })),
    ]
    const out = filterAsignadasAccepted(input)
    expect(out).toHaveLength(2)
    expect(out.map((e) => e.listing.id).sort()).toEqual(['a', 'c'])
  })

  it('excludes pending invitations (those live in Oportunidades)', () => {
    const input = [
      entry(mkListing('pending-only', { assignmentStatus: 'pending_acceptance' })),
    ]
    expect(filterAsignadasAccepted(input)).toEqual([])
  })

  it('sorts by updatedAt descending', () => {
    const old = mkListing('old', {
      assignmentStatus: 'accepted',
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    })
    const newest = mkListing('newest', {
      assignmentStatus: 'accepted',
      updatedAt: new Date('2026-04-20T00:00:00Z'),
    })
    const middle = mkListing('middle', {
      assignmentStatus: 'accepted',
      updatedAt: new Date('2026-03-01T00:00:00Z'),
    })
    const out = filterAsignadasAccepted([entry(old), entry(newest), entry(middle)])
    expect(out.map((e) => e.listing.id)).toEqual(['newest', 'middle', 'old'])
  })

  it('returns empty array on empty input', () => {
    expect(filterAsignadasAccepted([])).toEqual([])
  })
})
