import { describe, it, expect } from 'vitest'
import { minPhotosFor, MIN_PHOTOS } from '../minPhotos'

/**
 * A new listing needs 3 photos. Editing one that was published with fewer
 * (older listings, or from the app, which never asks for 3 on an edit) must
 * not demand more photos before the owner can save a price change — the
 * website blocked every edit of such a listing at the photos step.
 */
describe('minPhotosFor', () => {
  it('a new listing needs 3', () => {
    expect(MIN_PHOTOS).toBe(3)
    expect(minPhotosFor({ isEditMode: false, originalCount: 0 })).toBe(3)
  })

  it('an edit never asks for more photos than the listing already had', () => {
    expect(minPhotosFor({ isEditMode: true, originalCount: 1 })).toBe(1)
    expect(minPhotosFor({ isEditMode: true, originalCount: 2 })).toBe(2)
  })

  it('an edit of a listing with 3 or more still keeps at least 3', () => {
    expect(minPhotosFor({ isEditMode: true, originalCount: 7 })).toBe(3)
  })

  it('an edit always keeps at least one photo', () => {
    expect(minPhotosFor({ isEditMode: true, originalCount: 0 })).toBe(1)
  })
})
