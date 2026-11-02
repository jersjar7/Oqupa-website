// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const h = vi.hoisted(() => ({
  behaviour: (_url: string): 'ok' | 'fail' | 'hang' => 'ok',
  inFlight: 0,
  maxInFlight: 0,
  aborted: [] as string[],
  sent: [] as string[],
  urlRequests: [] as Array<{ entityId: string; fileCount: number }>,
}))

vi.mock('firebase/storage', () => ({ ref: vi.fn(), uploadBytesResumable: vi.fn(), getDownloadURL: vi.fn() }))
vi.mock('@/lib/firebase', () => ({ storage: {}, functions: {} }))
vi.mock('@/lib/blurhash', () => ({ generateBlurHash: async () => 'HASH' }))
vi.mock('browser-image-compression', () => ({
  default: async (file: File, opts?: { onProgress?: (p: number) => void }) => {
    opts?.onProgress?.(50)
    opts?.onProgress?.(100)
    return file
  },
}))
vi.mock('firebase/functions', () => ({
  httpsCallable: () => async (req: { entityId: string; fileCount: number }) => {
    h.urlRequests.push(req)
    return {
      data: {
        uploads: Array.from({ length: req.fileCount }, (_, i) => ({
          objectKey: `property-photos/${req.entityId}/t-${i}.webp`,
          uploadUrl: `https://r2.test/${i}`,
        })),
      },
    }
  },
}))

class FakeXHR {
  status = 200
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  url = ''
  private open_ = true
  open(_m: string, url: string) { this.url = url }
  setRequestHeader() {}
  abort() {
    if (!this.open_) return
    this.open_ = false
    h.inFlight--
    h.aborted.push(this.url)
    this.onabort?.()
  }
  send() {
    h.inFlight++
    h.maxInFlight = Math.max(h.maxInFlight, h.inFlight)
    h.sent.push(this.url)
    const how = h.behaviour(this.url)
    if (how === 'hang') return
    setTimeout(() => {
      if (!this.open_) return
      this.open_ = false
      h.inFlight--
      if (how === 'fail') { this.onerror?.(); return }
      this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 })
      this.upload.onprogress?.({ lengthComputable: true, loaded: 10, total: 10 })
      this.onload?.()
    }, 5)
  }
}

import { storageService, PHOTO_UPLOAD_CONCURRENCY, PHOTO_UPLOAD_TIMEOUT_MS } from '../storageService'

const files = (n: number) =>
  Array.from({ length: n }, (_, i) => new File(['x'.repeat(10 * (i + 1))], `f${i}.jpg`, { type: 'image/jpeg' }))

beforeEach(() => {
  h.behaviour = () => 'ok'
  h.inFlight = 0
  h.maxInFlight = 0
  h.aborted.length = 0
  h.sent.length = 0
  h.urlRequests.length = 0
  vi.stubGlobal('XMLHttpRequest', FakeXHR)
  vi.stubGlobal('createImageBitmap', () => Promise.reject(new Error('no canvas')))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('storageService.uploadPropertyPhotosPooled', () => {
  it('limits are the agreed ones: 4 at a time, 30 s per photo', () => {
    expect(PHOTO_UPLOAD_CONCURRENCY).toBe(4)
    expect(PHOTO_UPLOAD_TIMEOUT_MS).toBe(30000)
  })

  it('never sends more than 4 photos at once, and returns results in order', async () => {
    const res = await storageService.uploadPropertyPhotosPooled('property_1', files(9))
    expect(h.maxInFlight).toBe(4)
    expect(h.sent).toHaveLength(9)
    expect(res.map((r) => r.objectKey)).toEqual(
      Array.from({ length: 9 }, (_, i) => `property-photos/property_1/t-${i}.webp`),
    )
  })

  it('asks for upload URLs once, under the given property, for exactly these photos', async () => {
    await storageService.uploadPropertyPhotosPooled('property_X', files(3))
    expect(h.urlRequests).toEqual([expect.objectContaining({ entityId: 'property_X', fileCount: 3 })])
  })

  it('reports each finished photo so a retry can skip it', async () => {
    const seen: number[] = []
    await storageService.uploadPropertyPhotosPooled('p', files(3), { onPhotoUploaded: (i) => seen.push(i) })
    expect(seen.sort()).toEqual([0, 1, 2])
  })

  it('reports progress by bytes, never backwards, ending at 1', async () => {
    const values: number[] = []
    await storageService.uploadPropertyPhotosPooled('p', files(5), { onProgress: (f) => values.push(f) })
    expect(values.length).toBeGreaterThan(5)
    for (let i = 1; i < values.length; i++) expect(values[i]!).toBeGreaterThanOrEqual(values[i - 1]!)
    expect(values.at(-1)).toBe(1)
    // Compression counts as progress before any byte is uploaded.
    expect(values[0]!).toBeGreaterThan(0)
  })

  it('a slow photo is aborted after 30 s and the whole upload fails', async () => {
    vi.useFakeTimers()
    h.behaviour = (url) => (url.endsWith('/1') ? 'hang' : 'ok')
    const p = storageService.uploadPropertyPhotosPooled('p', files(2))
    const assertion = expect(p).rejects.toThrow(/timed out/)
    await vi.advanceTimersByTimeAsync(30000)
    await assertion
    expect(h.aborted).toContain('https://r2.test/1')
  })

  it('the first failure stops new photos and aborts the ones still travelling', async () => {
    h.behaviour = (url) => (url.endsWith('/0') ? 'fail' : url.endsWith('/1') ? 'hang' : 'ok')
    await expect(storageService.uploadPropertyPhotosPooled('p', files(8))).rejects.toThrow('Upload failed')
    expect(h.aborted).toContain('https://r2.test/1')
    expect(h.sent.length).toBeLessThan(8)
  })

  it('nothing to upload makes no calls', async () => {
    expect(await storageService.uploadPropertyPhotosPooled('p', [])).toEqual([])
    expect(h.urlRequests).toHaveLength(0)
  })
})
