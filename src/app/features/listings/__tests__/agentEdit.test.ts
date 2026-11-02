// What the website sends when an assigned agent saves (audit 2026-11-02, top
// item 14): photos go as `photoKeys`, as the app does. `propertyPhotoUrls`
// only accepts https addresses, which every R2 object key fails, so every
// photo change was refused with "All photo URLs must be valid HTTPS URLs".
import { describe, it, expect } from 'vitest'
import { agentEditParams } from '../agentEdit'

const K0 = 'property-photos/p1/1-0.webp'
const K1 = 'property-photos/p1/1-1.webp'
const KEYS = [K0, K1]

describe('agentEditParams', () => {
  it('sends changed photos as photoKeys, never propertyPhotoUrls', () => {
    const params = agentEditParams({
      listingId: 'L1',
      description: 'Casa',
      originalDescription: 'Casa',
      photoRefs: [K1],
      originalPhotoRefs: KEYS,
    })
    expect(params).toEqual({ listingId: 'L1', photoKeys: [K1] })
    expect(params).not.toHaveProperty('propertyPhotoUrls')
  })

  it('sends only the description when only it changed', () => {
    expect(
      agentEditParams({
        listingId: 'L1',
        description: 'Nueva',
        originalDescription: 'Casa',
        photoRefs: KEYS,
        originalPhotoRefs: KEYS,
      }),
    ).toEqual({ listingId: 'L1', description: 'Nueva' })
  })

  it('a reorder is a change', () => {
    expect(
      agentEditParams({
        listingId: 'L1',
        description: 'Casa',
        originalDescription: 'Casa',
        photoRefs: [K1, K0],
        originalPhotoRefs: KEYS,
      }),
    ).toEqual({ listingId: 'L1', photoKeys: [K1, K0] })
  })

  it('returns null when nothing changed', () => {
    expect(
      agentEditParams({
        listingId: 'L1',
        description: 'Casa',
        originalDescription: 'Casa',
        photoRefs: KEYS,
        originalPhotoRefs: KEYS,
      }),
    ).toBeNull()
  })
})
