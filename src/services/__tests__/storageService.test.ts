// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  refMock, uploadBytesResumableMock, getDownloadURLMock,
  httpsCallableMock, callableFnMock,
  imageCompressionMock, generateBlurHashMock,
} = vi.hoisted(() => {
  const callableFnMock = vi.fn()
  return {
    refMock: vi.fn(() => ({ __ref: true })),
    uploadBytesResumableMock: vi.fn(),
    getDownloadURLMock: vi.fn(),
    httpsCallableMock: vi.fn(() => callableFnMock),
    callableFnMock,
    imageCompressionMock: vi.fn(),
    generateBlurHashMock: vi.fn(() => Promise.resolve('LGF5?xYk^6#M@-5c,1J5@[or[Q6.')),
  }
})

vi.mock('firebase/storage', () => ({
  ref: (...args: unknown[]) => refMock(...args),
  uploadBytesResumable: (...args: unknown[]) => uploadBytesResumableMock(...args),
  getDownloadURL: (...args: unknown[]) => getDownloadURLMock(...args),
}))

vi.mock('firebase/functions', () => ({
  httpsCallable: (...args: unknown[]) => httpsCallableMock(...args),
}))

vi.mock('@/lib/firebase', () => ({
  storage: { __storage: true },
  functions: { __functions: true },
}))

vi.mock('browser-image-compression', () => ({
  default: (...args: unknown[]) => imageCompressionMock(...args),
}))

vi.mock('@/lib/blurhash', () => ({
  generateBlurHash: (...args: unknown[]) => generateBlurHashMock(...args),
}))

import { storageService } from '../storageService'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFile(name = 'photo.jpg', type = 'image/jpeg', size = 1024): File {
  const blob = new Blob(['x'.repeat(size)], { type })
  return new File([blob], name, { type })
}

// A class that acts as a constructor-compatible XHR mock
class MockXHR {
  status = 200
  upload = {
    onprogress: null as ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) | null,
  }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  open = vi.fn()
  setRequestHeader = vi.fn()
  send = vi.fn(function (this: MockXHR, _body: unknown) {
    // Default: auto-fire onload with status 200
    setTimeout(() => this.onload?.(), 0)
  })
}

let currentXHR: MockXHR

// Fake canvas context
const fakeCtx = { drawImage: vi.fn() }
const fakeCanvas = {
  width: 0,
  height: 0,
  getContext: vi.fn(() => fakeCtx),
  toDataURL: vi.fn(() => 'data:image/webp;base64,FAKETHUMB'),
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('storageService', () => {
  beforeEach(() => {
    callableFnMock.mockReset()
    httpsCallableMock.mockReset().mockReturnValue(callableFnMock)
    imageCompressionMock.mockReset()
    generateBlurHashMock.mockReset().mockResolvedValue('hash123')
    refMock.mockReset().mockReturnValue({ __ref: true })
    uploadBytesResumableMock.mockReset()
    getDownloadURLMock.mockReset()

    // Reset fake canvas mocks
    fakeCtx.drawImage.mockReset()
    fakeCanvas.getContext.mockReset().mockReturnValue(fakeCtx)
    fakeCanvas.toDataURL.mockReset().mockReturnValue('data:image/webp;base64,FAKETHUMB')

    // XHR constructor mock — must use `function` so `new` works
    currentXHR = new MockXHR()
    vi.stubGlobal('XMLHttpRequest', function MockXMLHttpRequest(this: MockXHR) {
      Object.assign(this, currentXHR)
      // Rebind send so `this` in the callback references the new instance
      this.send = function (body: unknown) { currentXHR.send(body) }
      this.open = currentXHR.open
      this.setRequestHeader = currentXHR.setRequestHeader
      this.upload = currentXHR.upload
      Object.defineProperty(this, 'status', {
        get: () => currentXHR.status,
        configurable: true,
      })
      Object.defineProperty(this, 'onload', {
        get: () => currentXHR.onload,
        set: (fn) => { currentXHR.onload = fn },
        configurable: true,
      })
      Object.defineProperty(this, 'onerror', {
        get: () => currentXHR.onerror,
        set: (fn) => { currentXHR.onerror = fn },
        configurable: true,
      })
    })

    // Mock createImageBitmap
    vi.stubGlobal('createImageBitmap', function () {
      return Promise.resolve({ width: 200, height: 150 })
    })

    // Mock document.createElement for canvas
    const originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation(function (tag: string) {
      if (tag === 'canvas') return fakeCanvas as unknown as HTMLElement
      return originalCreateElement(tag)
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  // ── compressImage ────────────────────────────────────────────────────────

  describe('compressImage', () => {
    it('calls imageCompression with the file and compression options', async () => {
      const file = makeFile()
      const compressedFile = makeFile('compressed.jpg')
      imageCompressionMock.mockResolvedValue(compressedFile)

      const result = await storageService.compressImage(file)

      expect(imageCompressionMock).toHaveBeenCalledOnce()
      expect(imageCompressionMock).toHaveBeenCalledWith(file, expect.objectContaining({
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      }))
      expect(result).toBe(compressedFile)
    })
  })

  // ── uploadPropertyPhoto ──────────────────────────────────────────────────

  describe('uploadPropertyPhoto', () => {
    it('returns objectKey, blurHash, and microThumb on success with presignedUpload', async () => {
      const file = makeFile()
      const compressedFile = makeFile('compressed.jpg')
      imageCompressionMock.mockResolvedValue(compressedFile)
      generateBlurHashMock.mockResolvedValue('blur-hash-value')

      const result = await storageService.uploadPropertyPhoto(
        'property-123',
        file,
        undefined,
        { uploadUrl: 'https://r2.example.com/upload', objectKey: 'properties/photo.jpg' }
      )

      expect(result.objectKey).toBe('properties/photo.jpg')
      expect(result.blurHash).toBe('blur-hash-value')
      expect(result.microThumb).toBe('FAKETHUMB')
    })

    it('uses presigned uploadUrl when provided', async () => {
      imageCompressionMock.mockResolvedValue(makeFile('c.jpg'))
      generateBlurHashMock.mockResolvedValue('h')

      await storageService.uploadPropertyPhoto(
        'prop-1',
        makeFile(),
        undefined,
        { uploadUrl: 'https://r2.custom.com/key', objectKey: 'obj-key' }
      )

      expect(currentXHR.open).toHaveBeenCalledWith('PUT', 'https://r2.custom.com/key')
    })

    it('requests a presigned URL from the callable when presignedUpload is not provided', async () => {
      imageCompressionMock.mockResolvedValue(makeFile('c.jpg'))
      generateBlurHashMock.mockResolvedValue('h')
      callableFnMock.mockResolvedValue({
        data: {
          uploads: [{ uploadUrl: 'https://r2.example.com/upload', objectKey: 'auto-key' }],
        },
      })

      const result = await storageService.uploadPropertyPhoto('prop-1', makeFile())

      expect(callableFnMock).toHaveBeenCalledWith(expect.objectContaining({
        category: 'property',
        entityId: 'prop-1',
        fileCount: 1,
      }))
      expect(result.objectKey).toBe('auto-key')
    })

    it('calls httpsCallable with "getUploadUrl" when no presigned URL provided', async () => {
      imageCompressionMock.mockResolvedValue(makeFile('c.jpg'))
      generateBlurHashMock.mockResolvedValue('h')
      callableFnMock.mockResolvedValue({
        data: { uploads: [{ uploadUrl: 'https://r2.example.com/u', objectKey: 'k' }] },
      })
      await storageService.uploadPropertyPhoto('prop-1', makeFile())
      expect(httpsCallableMock).toHaveBeenCalledWith(
        expect.anything(),
        'getUploadUrl',
      )
    })

    it('calls onProgress callback during upload', async () => {
      imageCompressionMock.mockResolvedValue(makeFile('c.jpg'))
      generateBlurHashMock.mockResolvedValue('h')

      // Override send to fire a progress event then onload
      currentXHR.send = vi.fn(function (_body: unknown) {
        const event = { lengthComputable: true, loaded: 50, total: 100 }
        currentXHR.upload.onprogress?.(event)
        setTimeout(() => currentXHR.onload?.(), 0)
      })

      const onProgress = vi.fn()
      await storageService.uploadPropertyPhoto(
        'prop-1',
        makeFile(),
        onProgress,
        { uploadUrl: 'https://r2.example.com/u', objectKey: 'k' }
      )

      expect(onProgress).toHaveBeenCalledWith(50)
    })

    it('rejects when XHR returns a non-2xx status', async () => {
      imageCompressionMock.mockResolvedValue(makeFile('c.jpg'))
      generateBlurHashMock.mockResolvedValue('h')

      currentXHR.status = 403
      currentXHR.send = vi.fn(function (_body: unknown) {
        setTimeout(() => currentXHR.onload?.(), 0)
      })

      await expect(
        storageService.uploadPropertyPhoto(
          'prop-1',
          makeFile(),
          undefined,
          { uploadUrl: 'https://r2.example.com/u', objectKey: 'k' }
        )
      ).rejects.toThrow('Upload failed with status 403')
    })

    it('rejects when XHR fires onerror', async () => {
      imageCompressionMock.mockResolvedValue(makeFile('c.jpg'))
      generateBlurHashMock.mockResolvedValue('h')

      currentXHR.send = vi.fn(function (_body: unknown) {
        setTimeout(() => currentXHR.onerror?.(), 0)
      })

      await expect(
        storageService.uploadPropertyPhoto(
          'prop-1',
          makeFile(),
          undefined,
          { uploadUrl: 'https://r2.example.com/u', objectKey: 'k' }
        )
      ).rejects.toThrow('Upload failed')
    })

    it('still returns a result when microThumb generation fails', async () => {
      imageCompressionMock.mockResolvedValue(makeFile('c.jpg'))
      generateBlurHashMock.mockResolvedValue('blur')

      // Make createImageBitmap reject
      vi.stubGlobal('createImageBitmap', function () {
        return Promise.reject(new Error('no bitmap support'))
      })

      const result = await storageService.uploadPropertyPhoto(
        'prop-1',
        makeFile(),
        undefined,
        { uploadUrl: 'https://r2.example.com/u', objectKey: 'k' }
      )

      expect(result.objectKey).toBe('k')
      expect(result.blurHash).toBe('blur')
      expect(result.microThumb).toBe('') // empty because it failed
    })

    it('uses image/webp fallback when compressed.type is empty (lines 79, 89)', async () => {
      // makeFile with empty type → compressed.type is '' → || 'image/webp' branch fires
      const noTypeFile = makeFile('photo.bin', '')
      const compressedNoType = makeFile('compressed.bin', '')
      imageCompressionMock.mockResolvedValue(compressedNoType)
      generateBlurHashMock.mockResolvedValue('hash')
      callableFnMock.mockResolvedValue({
        data: { uploads: [{ uploadUrl: 'https://r2.example.com/u', objectKey: 'k' }] },
      })

      const result = await storageService.uploadPropertyPhoto('prop-1', noTypeFile)

      // Verify the callable was called with image/webp as contentType fallback
      expect(callableFnMock).toHaveBeenCalledWith(expect.objectContaining({
        contentType: 'image/webp',
      }))
      expect(result.objectKey).toBe('k')
    })

    it('skips micro-thumbnail when canvas getContext returns null (lines 117-124)', async () => {
      imageCompressionMock.mockResolvedValue(makeFile('c.jpg'))
      generateBlurHashMock.mockResolvedValue('hash')

      // Override canvas mock to return null for getContext
      fakeCanvas.getContext.mockReturnValue(null)

      const result = await storageService.uploadPropertyPhoto(
        'prop-1',
        makeFile(),
        undefined,
        { uploadUrl: 'https://r2.example.com/u', objectKey: 'k' }
      )

      expect(result.microThumb).toBe('') // no context → microThumb stays empty
    })
  })

  // ── uploadUserPhoto ──────────────────────────────────────────────────────

  describe('uploadUserPhoto', () => {
    /**
     * Creates a mock upload task that fires the given callback after a tick.
     * This simulates the Firebase uploadBytesResumable task lifecycle.
     */
    type ProgressCb = (snap: { bytesTransferred: number; totalBytes: number }) => void
    type ErrorCb = (err: Error) => void
    type CompleteCb = () => Promise<void>

    function makeMockUploadTask(action: 'complete' | 'progress' | 'error', opts?: {
      progressSnap?: { bytesTransferred: number; totalBytes: number }
      error?: Error
    }) {
      const task = {
        snapshot: { ref: { __ref: true } },
        on: function (
          _event: string,
          progressCb: ProgressCb,
          errorCb: ErrorCb,
          completeCb: CompleteCb,
        ) {
          if (action === 'complete') {
            setTimeout(() => completeCb(), 0)
          } else if (action === 'progress' && opts?.progressSnap) {
            setTimeout(() => {
              progressCb(opts.progressSnap!)
              setTimeout(() => completeCb(), 0)
            }, 0)
          } else if (action === 'error' && opts?.error) {
            setTimeout(() => errorCb(opts.error!), 0)
          }
        },
      }
      return task
    }

    it('returns the download URL after a successful upload', async () => {
      const file = makeFile('profile.jpg')
      imageCompressionMock.mockResolvedValue(makeFile('compressed.jpg'))
      getDownloadURLMock.mockResolvedValue('https://firebase.example.com/user-photo.jpg')
      uploadBytesResumableMock.mockReturnValue(makeMockUploadTask('complete'))

      const result = await storageService.uploadUserPhoto('uid-123', file)
      expect(result).toBe('https://firebase.example.com/user-photo.jpg')
    })

    it('calls ref with the correct storage path', async () => {
      imageCompressionMock.mockResolvedValue(makeFile('c.jpg'))
      getDownloadURLMock.mockResolvedValue('https://url.com/photo.jpg')
      uploadBytesResumableMock.mockReturnValue(makeMockUploadTask('complete'))

      await storageService.uploadUserPhoto('user-abc', makeFile())

      expect(refMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('user-photos/user-abc/'),
      )
    })

    it('calls onProgress with percentage during upload', async () => {
      imageCompressionMock.mockResolvedValue(makeFile('c.jpg'))
      getDownloadURLMock.mockResolvedValue('https://url.com/photo.jpg')
      uploadBytesResumableMock.mockReturnValue(
        makeMockUploadTask('progress', { progressSnap: { bytesTransferred: 75, totalBytes: 100 } })
      )

      const onProgress = vi.fn()
      await storageService.uploadUserPhoto('uid-1', makeFile(), onProgress)

      expect(onProgress).toHaveBeenCalledWith(75)
    })

    it('rejects when upload fails', async () => {
      imageCompressionMock.mockResolvedValue(makeFile('c.jpg'))
      uploadBytesResumableMock.mockReturnValue(
        makeMockUploadTask('error', { error: new Error('storage/unauthorized') })
      )

      await expect(storageService.uploadUserPhoto('uid-1', makeFile())).rejects.toThrow('storage/unauthorized')
    })
  })

  // ── uploadMultiplePropertyPhotos ──────────────────────────────────────────

  describe('uploadMultiplePropertyPhotos', () => {
    beforeEach(() => {
      // For multiple uploads, each new XMLHttpRequest() call needs to return
      // a fresh instance that auto-resolves. Override the stub to create
      // a new auto-resolving XHR each time.
      vi.stubGlobal('XMLHttpRequest', function MockXMLHttpRequest(this: {
        status: number
        upload: { onprogress: null }
        onload: (() => void) | null
        onerror: (() => void) | null
        open: ReturnType<typeof vi.fn>
        setRequestHeader: ReturnType<typeof vi.fn>
        send: ReturnType<typeof vi.fn>
      }) {
        this.status = 200
        this.upload = { onprogress: null }
        this.onload = null
        this.onerror = null
        this.open = vi.fn()
        this.setRequestHeader = vi.fn()
        this.send = vi.fn(function (this: { onload: (() => void) | null }, _body: unknown) {
          setTimeout(() => this.onload?.(), 0)
        }.bind(this))
      })
    })

    it('returns an array of PhotoUploadResult for each file', async () => {
      const files = [makeFile('a.jpg'), makeFile('b.jpg')]
      imageCompressionMock.mockResolvedValue(makeFile('c.jpg'))
      generateBlurHashMock.mockResolvedValue('hash')
      callableFnMock.mockResolvedValue({
        data: {
          uploads: [
            { uploadUrl: 'https://r2.example.com/a', objectKey: 'key-a' },
            { uploadUrl: 'https://r2.example.com/b', objectKey: 'key-b' },
          ],
        },
      })

      const results = await storageService.uploadMultiplePropertyPhotos('prop-1', files)

      expect(results).toHaveLength(2)
      expect(results[0]!.objectKey).toBe('key-a')
      expect(results[1]!.objectKey).toBe('key-b')
    })

    it('calls getUploadUrl with fileCount matching the files array length', async () => {
      const files = [makeFile('a.jpg'), makeFile('b.jpg'), makeFile('c.jpg')]
      imageCompressionMock.mockResolvedValue(makeFile('c.jpg'))
      generateBlurHashMock.mockResolvedValue('hash')
      callableFnMock.mockResolvedValue({
        data: {
          uploads: [
            { uploadUrl: 'u1', objectKey: 'k1' },
            { uploadUrl: 'u2', objectKey: 'k2' },
            { uploadUrl: 'u3', objectKey: 'k3' },
          ],
        },
      })

      await storageService.uploadMultiplePropertyPhotos('prop-2', files)

      expect(callableFnMock).toHaveBeenCalledWith(expect.objectContaining({
        fileCount: 3,
        category: 'property',
        entityId: 'prop-2',
      }))
    })

    it('calls onProgress callback with aggregated progress across all files', async () => {
      // Override the XHR mock from the outer describe.beforeEach to also fire a progress event
      const progressXhr = new MockXHR()
      progressXhr.send = vi.fn(function (_body: unknown) {
        const event = { lengthComputable: true, loaded: 50, total: 100 }
        progressXhr.upload.onprogress?.(event)
        setTimeout(() => progressXhr.onload?.(), 0)
      })
      // The section's beforeEach overrides XMLHttpRequest; re-stub to use progressXhr
      vi.stubGlobal('XMLHttpRequest', function MockXHRWithProgress(this: {
        status: number
        upload: {
          onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null
        }
        onload: (() => void) | null
        onerror: (() => void) | null
        open: ReturnType<typeof vi.fn>
        setRequestHeader: ReturnType<typeof vi.fn>
        send: ReturnType<typeof vi.fn>
      }) {
        this.status = 200
        this.upload = progressXhr.upload
        this.onload = null
        this.onerror = null
        this.open = progressXhr.open
        this.setRequestHeader = progressXhr.setRequestHeader
        Object.defineProperty(this, 'onload', {
          get: () => progressXhr.onload,
          set: (fn) => { progressXhr.onload = fn },
          configurable: true,
        })
        this.send = function (body: unknown) { progressXhr.send(body) }
      })

      const files = [makeFile('a.jpg')]
      imageCompressionMock.mockResolvedValue(makeFile('c.jpg'))
      generateBlurHashMock.mockResolvedValue('hash')
      callableFnMock.mockResolvedValue({
        data: { uploads: [{ uploadUrl: 'https://r2.example.com/a', objectKey: 'key-a' }] },
      })

      const progressValues: number[] = []
      await storageService.uploadMultiplePropertyPhotos('prop-3', files, (p) => {
        progressValues.push(p)
      })

      // Should have been called with some progress value(s)
      expect(progressValues.length).toBeGreaterThan(0)
    })
  })

  // ── deleteR2Photos ────────────────────────────────────────────────────────

  describe('deleteR2Photos', () => {
    it('does nothing when objectKeys is empty', async () => {
      await storageService.deleteR2Photos([])
      expect(callableFnMock).not.toHaveBeenCalled()
    })

    it('calls deleteR2Objects callable with the objectKeys', async () => {
      callableFnMock.mockResolvedValue({ data: { deleted: 2 } })
      await storageService.deleteR2Photos(['key-1', 'key-2'])
      expect(callableFnMock).toHaveBeenCalledWith({ objectKeys: ['key-1', 'key-2'] })
    })

    it('calls httpsCallable with "deleteR2Objects"', async () => {
      callableFnMock.mockResolvedValue({ data: { deleted: 1 } })
      await storageService.deleteR2Photos(['key-1'])
      expect(httpsCallableMock).toHaveBeenCalledWith(
        expect.anything(),
        'deleteR2Objects',
      )
    })
  })
})
