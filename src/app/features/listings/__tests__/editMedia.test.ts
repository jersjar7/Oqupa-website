import { describe, it, expect } from 'vitest'
import { coverMicroThumbOnEdit } from '../editMedia'

/**
 * The cover photo's blurred preview (`primaryPhotoMicroThumb`), shown while
 * the real photo loads. An edit rewrote the whole `media` map without it, so
 * every edited listing lost its preview.
 */
const base = {
  photoOrder: [] as Array<{ type: 'existing' | 'new'; index: number }>,
  existingPhotoUrls: ['k1', 'k2'],
  newMicroThumbs: [] as string[],
  originalCoverKey: 'k1',
  originalCoverMicroThumb: 'THUMB1',
}

describe('coverMicroThumbOnEdit', () => {
  it('cover unchanged: keeps the preview it had', () => {
    expect(coverMicroThumbOnEdit(base)).toBe('THUMB1')
    expect(coverMicroThumbOnEdit({ ...base, photoOrder: [{ type: 'existing', index: 0 }, { type: 'existing', index: 1 }] }))
      .toBe('THUMB1')
  })

  it('a newly uploaded photo as cover: its own preview', () => {
    expect(coverMicroThumbOnEdit({
      ...base,
      photoOrder: [{ type: 'new', index: 1 }, { type: 'existing', index: 0 }],
      newMicroThumbs: ['N0', 'N1'],
    })).toBe('N1')
  })

  it('another existing photo moved to cover: no preview rather than the wrong one', () => {
    expect(coverMicroThumbOnEdit({ ...base, photoOrder: [{ type: 'existing', index: 1 }, { type: 'existing', index: 0 }] }))
      .toBe('')
  })

  it('the old cover removed, the next existing photo now first: no preview rather than the wrong one', () => {
    expect(coverMicroThumbOnEdit({ ...base, existingPhotoUrls: ['k2'] })).toBe('')
  })

  it('no existing photos left, new ones only (no order recorded): the first upload', () => {
    expect(coverMicroThumbOnEdit({ ...base, existingPhotoUrls: [], newMicroThumbs: ['N0'] })).toBe('N0')
  })
})
