import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  docs: new Map<string, Record<string, unknown>>(),
  commits: [] as Array<Array<[string, Record<string, unknown>]>>,
}))

vi.mock('@/lib/firebase', () => ({ db: {}, functions: {} }))
vi.mock('@/lib/analytics', () => ({ AnalyticsLogger: new Proxy({}, { get: () => () => {} }) }))
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn() }))
vi.mock('firebase/firestore', async (importOriginal) => {
  const real = await importOriginal<typeof import('firebase/firestore')>()
  type Ref = { path: string }
  return {
    ...real,
    serverTimestamp: () => '__ts__',
    doc: (_db: unknown, coll: string, id: string): Ref => ({ path: `${coll}/${id}` }),
    runTransaction: async (_db: unknown, fn: (tx: unknown) => Promise<unknown>) => {
      const ops: Array<[string, Record<string, unknown>]> = []
      const tx = {
        get: async (ref: Ref) => ({ exists: () => h.docs.has(ref.path), data: () => h.docs.get(ref.path) }),
        set: (ref: Ref, data: Record<string, unknown>) => { ops.push([ref.path, data]) },
      }
      const out = await fn(tx)
      if (ops.length) {
        h.commits.push(ops)
        for (const [p, d] of ops) h.docs.set(p, d)
      }
      return out
    },
  }
})

import { firestoreService } from '../firestoreService'

const ids = { propertyId: 'property_1_aaaaaaa', listingId: 'listing_1_aaaaaaa' }
const property = { listedByUserId: 'u1', propertyType: 'casa', calle: undefined } as never
const listing = { ownerId: 'u1', status: 'active', viewCount: 5, contactClickCount: 0 } as never

beforeEach(() => {
  h.docs.clear()
  h.commits.length = 0
})

describe('firestoreService.publishPropertyAndListing', () => {
  it('writes the property and the listing in ONE commit, under the given ids', async () => {
    const res = await firestoreService.publishPropertyAndListing(ids, property, listing)
    expect(res).toMatchObject({ alreadyPublished: false })
    expect(h.commits).toHaveLength(1)
    expect(h.commits[0]!.map(([p]) => p)).toEqual([
      'properties/property_1_aaaaaaa',
      'listings/listing_1_aaaaaaa',
    ])
  })

  it('stamps the listing as a fresh website listing and drops undefined fields', async () => {
    await firestoreService.publishPropertyAndListing(ids, property, listing)
    const l = h.docs.get('listings/listing_1_aaaaaaa')!
    expect(l).toMatchObject({ createdFrom: 'web', viewCount: 0, createdAt: '__ts__', updatedAt: '__ts__' })
    expect('calle' in h.docs.get('properties/property_1_aaaaaaa')!).toBe(false)
  })

  it('a second attempt finds the listing and writes nothing', async () => {
    await firestoreService.publishPropertyAndListing(ids, property, listing)
    h.docs.set('properties/property_1_aaaaaaa', { listedByUserId: 'u1', masked: true })
    const res = await firestoreService.publishPropertyAndListing(ids, property, listing)
    expect(res).toMatchObject({ alreadyPublished: true })
    expect(h.commits).toHaveLength(1)
    // The server's later changes (e.g. the masked address) are left alone.
    expect(h.docs.get('properties/property_1_aaaaaaa')).toEqual({ listedByUserId: 'u1', masked: true })
  })

  it('refuses ids that belong to someone else', async () => {
    h.docs.set('listings/listing_1_aaaaaaa', { ownerId: 'other' })
    await expect(firestoreService.publishPropertyAndListing(ids, property, listing)).rejects.toThrow('publish-id-taken')
    h.docs.clear()
    h.docs.set('properties/property_1_aaaaaaa', { listedByUserId: 'other' })
    await expect(firestoreService.publishPropertyAndListing(ids, property, listing)).rejects.toThrow('publish-id-taken')
    expect(h.commits).toHaveLength(0)
  })

  it('reports when the existence check is done', async () => {
    const onStage = vi.fn()
    await firestoreService.publishPropertyAndListing(ids, property, listing, onStage)
    expect(onStage).toHaveBeenCalledWith('read')
  })

  it('stores the draft fingerprint on the listing', async () => {
    await firestoreService.publishPropertyAndListing(ids, property, listing, undefined, 'abc')
    expect(h.docs.get('listings/listing_1_aaaaaaa')!.publishDraftHash).toBe('abc')
  })

  it('an existing listing from the SAME draft is the same content', async () => {
    await firestoreService.publishPropertyAndListing(ids, property, listing, undefined, 'abc')
    const res = await firestoreService.publishPropertyAndListing(ids, property, listing, undefined, 'abc')
    expect(res).toEqual({ alreadyPublished: true, sameContent: true })
  })

  it('an existing listing from an EARLIER version of the draft is flagged, and still nothing is written', async () => {
    await firestoreService.publishPropertyAndListing(ids, property, listing, undefined, 'old')
    const res = await firestoreService.publishPropertyAndListing(ids, property, listing, undefined, 'new')
    expect(res).toEqual({ alreadyPublished: true, sameContent: false })
    expect(h.commits).toHaveLength(1)
  })
})
