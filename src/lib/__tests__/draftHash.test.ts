import { describe, it, expect } from 'vitest'
import { draftHash } from '../draftHash'

const p = { listedByUserId: 'u', specs: { totalAreaInSquareMeters: 100 }, media: { photoKeys: ['a', 'b'] } }
const l = { ownerId: 'u', description: 'Casa amplia', price: { amount: 10, currency: 'PEN' } }

describe('draftHash', () => {
  it('is the same for the same draft, whatever the key order', () => {
    expect(draftHash(p, l)).toBe(draftHash({ media: p.media, specs: p.specs, listedByUserId: 'u' }, { ...l }))
  })

  it('ignores what changes per attempt: dates, traffic stamp, undefined', () => {
    const a = draftHash(p, { ...l, publishedAt: new Date(1), expiresAt: new Date(2), attribution: { s: 'x' } })
    const b = draftHash(p, { ...l, publishedAt: new Date(9), expiresAt: new Date(8), extra: undefined })
    expect(a).toBe(b)
  })

  it('changes when the person changes the draft', () => {
    expect(draftHash(p, l)).not.toBe(draftHash(p, { ...l, description: 'Casa amplia y bonita' }))
    expect(draftHash(p, l)).not.toBe(draftHash(p, { ...l, price: { amount: 11, currency: 'PEN' } }))
    expect(draftHash(p, l)).not.toBe(draftHash({ ...p, media: { photoKeys: ['b', 'a'] } }, l))
  })
})
