// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePhotoQueue } from '../usePhotoQueue'

// jsdom does not implement URL.createObjectURL — stub it.
beforeEach(() => {
  let counter = 0
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => `blob:test-${counter++}`),
    revokeObjectURL: vi.fn(),
  })
})

function fakeFile(name: string): File {
  return new File(['x'], name, { type: 'image/jpeg' })
}

describe('usePhotoQueue', () => {
  it('seeds items from existing urls + new files in order', () => {
    const { result } = renderHook(() =>
      usePhotoQueue({
        existingPhotoUrls: ['key-a', 'key-b'],
        existingPhotoBlurHashes: ['hash-a', 'hash-b'],
        photos: [fakeFile('c.jpg')],
      })
    )

    expect(result.current.items).toHaveLength(3)
    expect(result.current.items[0]).toMatchObject({
      type: 'existing',
      url: 'key-a',
      blurHash: 'hash-a',
    })
    expect(result.current.items[1]).toMatchObject({
      type: 'existing',
      url: 'key-b',
      blurHash: 'hash-b',
    })
    expect(result.current.items[2]).toMatchObject({ type: 'new' })
  })

  it('assigns unique stable ids', () => {
    const { result } = renderHook(() =>
      usePhotoQueue({
        existingPhotoUrls: ['a', 'b'],
        existingPhotoBlurHashes: ['', ''],
        photos: [fakeFile('c.jpg')],
      })
    )
    const ids = result.current.items.map((i) => i.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('addFiles appends new files capped at MAX_PHOTOS (25)', () => {
    const seedFiles = Array.from({ length: 24 }, (_, i) => fakeFile(`s${i}.jpg`))
    const { result } = renderHook(() =>
      usePhotoQueue({
        existingPhotoUrls: [],
        existingPhotoBlurHashes: [],
        photos: seedFiles,
      })
    )

    act(() => {
      result.current.addFiles([fakeFile('extra1.jpg'), fakeFile('extra2.jpg')])
    })

    expect(result.current.items).toHaveLength(25)
  })

  it('remove drops the item at the given index', () => {
    const { result } = renderHook(() =>
      usePhotoQueue({
        existingPhotoUrls: ['a', 'b', 'c'],
        existingPhotoBlurHashes: ['ha', 'hb', 'hc'],
        photos: [],
      })
    )

    act(() => result.current.remove(1))

    const urls = result.current.items.map((i) => (i.type === 'existing' ? i.url : null))
    expect(urls).toEqual(['a', 'c'])
  })

  it('reorder splices an item from one index to another', () => {
    const { result } = renderHook(() =>
      usePhotoQueue({
        existingPhotoUrls: ['a', 'b', 'c', 'd'],
        existingPhotoBlurHashes: ['', '', '', ''],
        photos: [],
      })
    )

    act(() => result.current.reorder(3, 0))
    const urls = result.current.items.map((i) => (i.type === 'existing' ? i.url : ''))
    expect(urls).toEqual(['d', 'a', 'b', 'c'])
  })

  it('toSubmitData splits items + keeps blurHashes aligned with existingPhotoUrls', () => {
    const fileC = fakeFile('c.jpg')
    const { result } = renderHook(() =>
      usePhotoQueue({
        existingPhotoUrls: ['a', 'b'],
        existingPhotoBlurHashes: ['ha', 'hb'],
        photos: [fileC],
      })
    )

    // Reorder so the new file is first, then existing 'b', then existing 'a'
    act(() => result.current.reorder(2, 0))
    act(() => result.current.reorder(2, 1))

    const submit = result.current.toSubmitData()
    expect(submit.photos).toEqual([fileC])
    expect(submit.existingPhotoUrls).toEqual(['b', 'a'])
    expect(submit.existingPhotoBlurHashes).toEqual(['hb', 'ha'])
    expect(submit.photoOrder).toEqual([
      { type: 'new', index: 0 },
      { type: 'existing', index: 0 },
      { type: 'existing', index: 1 },
    ])
  })

  it('blurHash stays glued to its existing item across reorder', () => {
    const { result } = renderHook(() =>
      usePhotoQueue({
        existingPhotoUrls: ['a', 'b', 'c'],
        existingPhotoBlurHashes: ['ha', 'hb', 'hc'],
        photos: [],
      })
    )

    // Drag 'c' (index 2) to the cover slot (index 0).
    act(() => result.current.reorder(2, 0))
    const submit = result.current.toSubmitData()

    expect(submit.existingPhotoUrls[0]).toBe('c')
    expect(submit.existingPhotoBlurHashes[0]).toBe('hc')
  })

  it('falls back to empty string when blurHash array is shorter than urls array', () => {
    // existingPhotoBlurHashes has fewer entries than existingPhotoUrls
    const { result } = renderHook(() =>
      usePhotoQueue({
        existingPhotoUrls: ['a', 'b', 'c'],
        existingPhotoBlurHashes: ['ha'], // only one hash for 3 photos
        photos: [],
      })
    )

    const items = result.current.items
    expect(items[0]).toMatchObject({ type: 'existing', url: 'a', blurHash: 'ha' })
    expect(items[1]).toMatchObject({ type: 'existing', url: 'b', blurHash: '' })
    expect(items[2]).toMatchObject({ type: 'existing', url: 'c', blurHash: '' })
  })

  it('reorder ignores out-of-bounds fromIndex', () => {
    const { result } = renderHook(() =>
      usePhotoQueue({
        existingPhotoUrls: ['a', 'b'],
        existingPhotoBlurHashes: ['ha', 'hb'],
        photos: [],
      })
    )

    const before = result.current.items.map((i) => (i.type === 'existing' ? i.url : ''))
    act(() => result.current.reorder(-1, 0)) // invalid fromIndex
    const after = result.current.items.map((i) => (i.type === 'existing' ? i.url : ''))
    expect(after).toEqual(before) // no change
  })

  it('reorder ignores out-of-bounds toIndex', () => {
    const { result } = renderHook(() =>
      usePhotoQueue({
        existingPhotoUrls: ['a', 'b'],
        existingPhotoBlurHashes: ['ha', 'hb'],
        photos: [],
      })
    )

    const before = result.current.items.map((i) => (i.type === 'existing' ? i.url : ''))
    act(() => result.current.reorder(0, 99)) // invalid toIndex
    const after = result.current.items.map((i) => (i.type === 'existing' ? i.url : ''))
    expect(after).toEqual(before) // no change
  })

  it('reorder is a no-op when fromIndex === toIndex', () => {
    const { result } = renderHook(() =>
      usePhotoQueue({
        existingPhotoUrls: ['a', 'b', 'c'],
        existingPhotoBlurHashes: ['ha', 'hb', 'hc'],
        photos: [],
      })
    )

    const before = result.current.items
    act(() => result.current.reorder(1, 1))
    expect(result.current.items).toBe(before) // same reference (returned prev)
  })

  it('addFiles does nothing when already at MAX_PHOTOS cap', () => {
    const seedFiles = Array.from({ length: 25 }, (_, i) => fakeFile(`s${i}.jpg`))
    const { result } = renderHook(() =>
      usePhotoQueue({
        existingPhotoUrls: [],
        existingPhotoBlurHashes: [],
        photos: seedFiles,
      })
    )

    act(() => {
      result.current.addFiles([fakeFile('overflow.jpg')])
    })

    expect(result.current.items).toHaveLength(25)
  })

  it('previewUrls map contains one entry per unique new-file', () => {
    const file1 = fakeFile('photo1.jpg')
    const file2 = fakeFile('photo2.jpg')
    const { result } = renderHook(() =>
      usePhotoQueue({
        existingPhotoUrls: [],
        existingPhotoBlurHashes: [],
        photos: [file1, file2],
      })
    )

    expect(result.current.previewUrls.size).toBe(2)
    expect(result.current.previewUrls.has(file1)).toBe(true)
    expect(result.current.previewUrls.has(file2)).toBe(true)
  })

  it('previewUrls does not include entries for existing photos', () => {
    const { result } = renderHook(() =>
      usePhotoQueue({
        existingPhotoUrls: ['existing-key'],
        existingPhotoBlurHashes: ['hash'],
        photos: [],
      })
    )

    expect(result.current.previewUrls.size).toBe(0)
  })

  it('toSubmitData with only existing photos returns empty photos array', () => {
    const { result } = renderHook(() =>
      usePhotoQueue({
        existingPhotoUrls: ['x', 'y'],
        existingPhotoBlurHashes: ['hx', 'hy'],
        photos: [],
      })
    )

    const submit = result.current.toSubmitData()
    expect(submit.photos).toHaveLength(0)
    expect(submit.existingPhotoUrls).toEqual(['x', 'y'])
    expect(submit.existingPhotoBlurHashes).toEqual(['hx', 'hy'])
    expect(submit.photoOrder).toEqual([
      { type: 'existing', index: 0 },
      { type: 'existing', index: 1 },
    ])
  })

  it('toSubmitData with only new photos returns empty existingPhotoUrls', () => {
    const file = fakeFile('photo.jpg')
    const { result } = renderHook(() =>
      usePhotoQueue({
        existingPhotoUrls: [],
        existingPhotoBlurHashes: [],
        photos: [file],
      })
    )

    const submit = result.current.toSubmitData()
    expect(submit.photos).toEqual([file])
    expect(submit.existingPhotoUrls).toHaveLength(0)
    expect(submit.existingPhotoBlurHashes).toHaveLength(0)
    expect(submit.photoOrder).toEqual([{ type: 'new', index: 0 }])
  })

  it('starts with empty queue', () => {
    const { result } = renderHook(() =>
      usePhotoQueue({ existingPhotoUrls: [], existingPhotoBlurHashes: [], photos: [] })
    )

    expect(result.current.items).toHaveLength(0)
    expect(result.current.previewUrls.size).toBe(0)
    const submit = result.current.toSubmitData()
    expect(submit.photos).toHaveLength(0)
    expect(submit.existingPhotoUrls).toHaveLength(0)
    expect(submit.photoOrder).toHaveLength(0)
  })
})
