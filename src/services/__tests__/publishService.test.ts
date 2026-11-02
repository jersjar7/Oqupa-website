import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const h = vi.hoisted(() => ({
  upload: vi.fn(),
  save: vi.fn(),
}))

vi.mock('@/services/storageService', () => ({
  storageService: { uploadPropertyPhotosPooled: (...a: unknown[]) => h.upload(...a) },
}))
vi.mock('@/services/firestoreService', () => ({
  firestoreService: { publishPropertyAndListing: (...a: unknown[]) => h.save(...a) },
}))

import { publishListing, PublishError, PUBLISH_FAILED_MESSAGE, PUBLISH_SAVE_TIMEOUT_MS } from '../publishService'
import { photoFingerprints } from '@/lib/publishIdentity'

const file = (name: string, size = 10) => new File(['x'.repeat(size)], name, { lastModified: 1 })
const result = (k: string) => ({ objectKey: k, blurHash: `h-${k}`, microThumb: `m-${k}` })

function request(overrides: Partial<Parameters<typeof publishListing>[0]> = {}) {
  return {
    publishId: '1_abcdefg',
    photos: [file('a'), file('b'), file('c')],
    uploadedPhotos: {},
    buildDocs: ({ media }: { media: { photoKeys: string[] } }) => ({
      property: { listedByUserId: 'u1', media: { photoKeys: media.photoKeys } } as never,
      listing: { ownerId: 'u1', media: { photoKeys: media.photoKeys } } as never,
    }),
    ...overrides,
  }
}

beforeEach(() => {
  h.upload.mockReset().mockImplementation(async (_pid: string, files: File[], opts: { onPhotoUploaded?: (i: number, r: unknown) => void; onProgress?: (f: number) => void }) => {
    opts.onProgress?.(0.5)
    const res = files.map((f) => result(`k-${f.name}`))
    res.forEach((r, i) => opts.onPhotoUploaded?.(i, r))
    opts.onProgress?.(1)
    return res
  })
  h.save.mockReset().mockImplementation(async (_ids: unknown, _p: unknown, _l: unknown, onStage?: (s: string) => void) => {
    onStage?.('read')
    return { alreadyPublished: false }
  })
})

afterEach(() => vi.useRealTimers())

describe('publishListing', () => {
  it('uploads photos under the draft identity first, then saves both documents once', async () => {
    const out = await publishListing(request())
    expect(h.upload).toHaveBeenCalledOnce()
    expect(h.upload.mock.calls[0]![0]).toBe('property_1_abcdefg')
    expect(h.save).toHaveBeenCalledOnce()
    expect(h.save.mock.calls[0]![0]).toEqual({ propertyId: 'property_1_abcdefg', listingId: 'listing_1_abcdefg' })
    expect(h.upload.mock.invocationCallOrder[0]!).toBeLessThan(h.save.mock.invocationCallOrder[0]!)
    expect(out.media).toEqual({
      photoKeys: ['k-a', 'k-b', 'k-c'],
      blurHashes: ['h-k-a', 'h-k-b', 'h-k-c'],
      microThumb: 'm-k-a',
    })
  })

  it('skips photos already uploaded and keeps the original order', async () => {
    const photos = [file('a'), file('b'), file('c')]
    const fp = photoFingerprints(photos)
    const out = await publishListing(request({
      photos,
      uploadedPhotos: { [fp[0]!]: result('old-a'), [fp[2]!]: result('old-c') },
    }))
    expect((h.upload.mock.calls[0]![1] as File[]).map((f) => f.name)).toEqual(['b'])
    expect(out.media.photoKeys).toEqual(['old-a', 'k-b', 'old-c'])
    expect(out.media.microThumb).toBe('m-old-a')
  })

  it('every photo already uploaded: no upload at all', async () => {
    const photos = [file('a')]
    const [fp] = photoFingerprints(photos)
    await publishListing(request({ photos, uploadedPhotos: { [fp!]: result('old') } }))
    expect(h.upload).not.toHaveBeenCalled()
    expect(h.save).toHaveBeenCalledOnce()
  })

  it('hands each finished photo back by fingerprint, so it can be kept with the draft', async () => {
    const photos = [file('a'), file('b')]
    const fp = photoFingerprints(photos)
    const onPhotoUploaded = vi.fn()
    await publishListing(request({ photos, onPhotoUploaded }))
    expect(onPhotoUploaded).toHaveBeenCalledWith(fp[0], result('k-a'))
    expect(onPhotoUploaded).toHaveBeenCalledWith(fp[1], result('k-b'))
  })

  it('reports photos by bytes, then the save, never backwards', async () => {
    const events: Array<[string, number]> = []
    await publishListing(request({ onProgress: (s, f) => events.push([s, f]) }))
    const scale = events.map(([s, f]) => (s === 'photos' ? f : 1 + f))
    for (let i = 1; i < scale.length; i++) expect(scale[i]!).toBeGreaterThanOrEqual(scale[i - 1]!)
    expect(events[events.length - 1]).toEqual(['save', 1])
    expect(events).toContainEqual(['save', 0.5])
  })

  it('a failed upload is reported in Spanish, and nothing is saved', async () => {
    h.upload.mockRejectedValue(new Error('Upload failed'))
    const err = await publishListing(request()).catch((e) => e)
    expect(err).toBeInstanceOf(PublishError)
    expect(err.message).toBe(PUBLISH_FAILED_MESSAGE)
    expect(h.save).not.toHaveBeenCalled()
  })

  it('a failed save is reported in Spanish', async () => {
    h.save.mockRejectedValue(new Error('PERMISSION_DENIED'))
    await expect(publishListing(request())).rejects.toThrow(PUBLISH_FAILED_MESSAGE)
  })

  it('a save that takes longer than 20 s fails with the Spanish message', async () => {
    vi.useFakeTimers()
    h.save.mockReturnValue(new Promise(() => {}))
    const p = publishListing(request())
    const assertion = expect(p).rejects.toThrow(PUBLISH_FAILED_MESSAGE)
    await vi.advanceTimersByTimeAsync(PUBLISH_SAVE_TIMEOUT_MS)
    await assertion
    expect(PUBLISH_SAVE_TIMEOUT_MS).toBe(20000)
  })

  it('says when an earlier attempt had already saved it', async () => {
    h.save.mockResolvedValue({ alreadyPublished: true })
    expect((await publishListing(request())).alreadyPublished).toBe(true)
  })
})
