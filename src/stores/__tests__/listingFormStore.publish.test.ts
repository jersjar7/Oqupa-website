// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useListingFormStore } from '../listingFormStore'

const KEY = 'oqupa-listing-form'
const store = () => useListingFormStore.getState()
const photo = { objectKey: 'property-photos/p/1-0.webp', blurHash: 'LKO2', microThumb: 'AAA' }

describe('listingFormStore — publish identity (ADR-043)', () => {
  beforeEach(() => {
    sessionStorage.clear()
    store().reset()
  })

  afterEach(() => {
    vi.resetModules()
    sessionStorage.clear()
  })

  it('a draft has an identity from the moment the wizard opens', () => {
    expect(store().publishId).toMatch(/^\d+_[a-z0-9]{7}$/)
  })

  it('the identity is stored WITH the draft', () => {
    store().updateData({ description: 'x' })
    const saved = JSON.parse(sessionStorage.getItem(KEY)!)
    expect(saved.publishId).toBe(store().publishId)
  })

  it('the same identity comes back after a refresh', async () => {
    store().updateData({ description: 'x' })
    const before = store().publishId
    vi.resetModules()
    const { useListingFormStore: fresh } = await import('../listingFormStore')
    expect(fresh.getState().publishId).toBe(before)
  })

  it('photos already uploaded are kept with the draft and survive a refresh', async () => {
    store().recordUploadedPhoto('a.jpg:3:5', photo)
    expect(JSON.parse(sessionStorage.getItem(KEY)!).uploadedPhotos).toEqual({ 'a.jpg:3:5': photo })
    vi.resetModules()
    const { useListingFormStore: fresh } = await import('../listingFormStore')
    expect(fresh.getState().uploadedPhotos).toEqual({ 'a.jpg:3:5': photo })
  })

  it('identity bookkeeping does not leak into the form data', () => {
    store().updateData({ description: 'x' })
    const data = store().data as unknown as Record<string, unknown>
    expect(data.publishId).toBeUndefined()
    expect(data.uploadedPhotos).toBeUndefined()
  })

  it('a new draft (reset) gets a new identity and forgets uploaded photos', () => {
    const first = store().publishId
    store().recordUploadedPhoto('a', photo)
    store().reset()
    expect(store().publishId).not.toBe(first)
    expect(store().uploadedPhotos).toEqual({})
  })

  describe('markPublished', () => {
    it('clears the draft from storage the moment the write succeeds', () => {
      store().updateData({ description: 'x' })
      store().markPublished('listing_1_abcdefg')
      expect(sessionStorage.getItem(KEY)).toBeNull()
      expect(store().publishedListingId).toBe('listing_1_abcdefg')
    })

    it('nothing re-saves the draft afterwards', () => {
      store().markPublished('listing_1_abcdefg')
      store().updateData({ description: 'late keystroke' })
      store().nextStep()
      store().recordUploadedPhoto('late', photo)
      expect(sessionStorage.getItem(KEY)).toBeNull()
    })

    it('a refresh after success opens an EMPTY wizard', async () => {
      store().updateData({ description: 'Casa grande con jardín', amount: 1000 })
      store().setStep(5)
      store().markPublished('listing_1_abcdefg')
      vi.resetModules()
      const { useListingFormStore: fresh } = await import('../listingFormStore')
      expect(fresh.getState().step).toBe(1)
      expect(fresh.getState().data.description).toBe('')
      expect(fresh.getState().data.amount).toBeNull()
      expect(fresh.getState().publishedListingId).toBeNull()
    })

    it('reset after success starts a fresh draft with a fresh identity', () => {
      const id = store().publishId
      store().markPublished('listing_x')
      store().reset()
      expect(store().publishedListingId).toBeNull()
      expect(store().publishId).not.toBe(id)
    })
  })
})
