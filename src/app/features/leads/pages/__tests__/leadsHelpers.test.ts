import { describe, it, expect } from 'vitest'
import {
  isValidLeadsTab, filterEnEspera, filterInvitaciones, type LeadsTab,
} from '../leadsHelpers'
import type { Listing } from '@/types/listing'
import type { Property } from '@/types/property'
import type { RealtorClaim } from '@/types/realtorClaim'

// ── Fixtures ────────────────────────────────────────────────────────────────

const me = 'realtor-me'
const otherRealtor = 'realtor-other'

function mkClaim(id: string, claimedAt: Date, opts: Partial<RealtorClaim> = {}): RealtorClaim {
  return {
    id,
    listingId: opts.listingId ?? `listing-${id}`,
    realtorId: opts.realtorId ?? me,
    listingOwnerId: opts.listingOwnerId ?? 'owner-1',
    claimedAt,
    claimMonth: `${claimedAt.getFullYear()}-${String(claimedAt.getMonth() + 1).padStart(2, '0')}`,
    realtorName: 'Me',
    realtorPhone: '',
    realtorBusinessName: '',
    ownerContacted: false,
    assignedByOwner: opts.assignedByOwner ?? false,
  }
}

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
    updatedAt: new Date(),
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

function claimEntry(claim: RealtorClaim, listing: Listing) {
  return { claim, listing, property: mkProperty(listing.propertyId) }
}

function listingEntry(listing: Listing) {
  return { listing, property: mkProperty(listing.propertyId) }
}

// ── isValidLeadsTab ─────────────────────────────────────────────────────────

describe('isValidLeadsTab', () => {
  it('accepts the three tabs', () => {
    expect(isValidLeadsTab('disponibles')).toBe(true)
    expect(isValidLeadsTab('en-espera')).toBe(true)
    expect(isValidLeadsTab('invitaciones')).toBe(true)
  })

  it('rejects unknown strings and null', () => {
    expect(isValidLeadsTab('reclamadas')).toBe(false)
    expect(isValidLeadsTab('random')).toBe(false)
    expect(isValidLeadsTab('')).toBe(false)
    expect(isValidLeadsTab(null)).toBe(false)
  })

  it('narrows the type', () => {
    const maybe = 'invitaciones'
    if (isValidLeadsTab(maybe)) {
      const t: LeadsTab = maybe
      expect(t).toBe('invitaciones')
    }
  })
})

// ── filterEnEspera ──────────────────────────────────────────────────────────

describe('filterEnEspera', () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000)

  it('returns claims where the owner hasn\'t picked anyone', () => {
    const input = [
      claimEntry(mkClaim('c1', daysAgo(3)), mkListing('l1')),                    // no assignee
      claimEntry(mkClaim('c2', daysAgo(1)), mkListing('l2', { assignedRealtorId: '' })), // empty assignee
    ]
    const out = filterEnEspera(input, me)
    expect(out).toHaveLength(2)
  })

  it('drops lost claims immediately (no fade window)', () => {
    const input = [
      claimEntry(mkClaim('c1', daysAgo(1)), mkListing('l1', { assignedRealtorId: otherRealtor })),
      claimEntry(mkClaim('c2', daysAgo(2)), mkListing('l2')),
    ]
    const out = filterEnEspera(input, me)
    expect(out).toHaveLength(1)
    expect(out[0]!.claim.id).toBe('c2')
  })

  it('drops won claims (owner picked me — those surface as Invitaciones instead)', () => {
    const input = [
      claimEntry(mkClaim('c1', daysAgo(1)), mkListing('l1', { assignedRealtorId: me })),
      claimEntry(mkClaim('c2', daysAgo(2)), mkListing('l2')),
    ]
    const out = filterEnEspera(input, me)
    expect(out).toHaveLength(1)
    expect(out[0]!.claim.id).toBe('c2')
  })

  it('drops claims the agent declined (server nulls assignedRealtorId but still puts the id in declinedRealtorIds)', () => {
    const input = [
      claimEntry(mkClaim('c-declined', daysAgo(1)),
        mkListing('l1', { assignedRealtorId: undefined, declinedRealtorIds: [me] })),
      claimEntry(mkClaim('c-waiting', daysAgo(2)), mkListing('l2')),
    ]
    const out = filterEnEspera(input, me)
    expect(out).toHaveLength(1)
    expect(out[0]!.claim.id).toBe('c-waiting')
  })

  it('still shows claims where OTHER agents declined (as long as I haven\'t)', () => {
    const input = [
      claimEntry(mkClaim('c1', daysAgo(1)),
        mkListing('l1', { assignedRealtorId: undefined, declinedRealtorIds: [otherRealtor] })),
    ]
    const out = filterEnEspera(input, me)
    expect(out).toHaveLength(1)
  })

  it('sorts by claimedAt descending', () => {
    const input = [
      claimEntry(mkClaim('old',    daysAgo(7)), mkListing('l1')),
      claimEntry(mkClaim('newest', daysAgo(1)), mkListing('l2')),
      claimEntry(mkClaim('middle', daysAgo(3)), mkListing('l3')),
    ]
    const out = filterEnEspera(input, me)
    expect(out.map((e) => e.claim.id)).toEqual(['newest', 'middle', 'old'])
  })

  it('returns empty on empty input', () => {
    expect(filterEnEspera([], me)).toEqual([])
  })
})

// ── filterInvitaciones ──────────────────────────────────────────────────────

describe('filterInvitaciones', () => {
  it('returns only listings with pending_acceptance status', () => {
    const input = [
      listingEntry(mkListing('a', { assignmentStatus: 'pending_acceptance' })),
      listingEntry(mkListing('b', { assignmentStatus: 'accepted' })),
      listingEntry(mkListing('c', { assignmentStatus: 'pending_acceptance' })),
    ]
    const out = filterInvitaciones(input)
    expect(out).toHaveLength(2)
    expect(out.map((e) => e.listing.id).sort()).toEqual(['a', 'c'])
  })

  it('excludes accepted assignments (those live in Mis Propiedades)', () => {
    const input = [
      listingEntry(mkListing('accepted-only', { assignmentStatus: 'accepted' })),
    ]
    expect(filterInvitaciones(input)).toEqual([])
  })

  it('returns empty on empty input', () => {
    expect(filterInvitaciones([])).toEqual([])
  })
})
