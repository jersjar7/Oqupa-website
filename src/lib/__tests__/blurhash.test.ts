// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const decodeMock = vi.fn()
const encodeMock = vi.fn()

vi.mock('blurhash', () => ({
  decode: (...args: unknown[]) => decodeMock(...args),
  encode: (...args: unknown[]) => encodeMock(...args),
}))

import { blurHashToDataUrl, generateBlurHash } from '../blurhash'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFile(name = 'photo.jpg', type = 'image/jpeg'): File {
  const blob = new Blob(['test'], { type })
  return new File([blob], name, { type })
}

// Creates a fake canvas with context
function makeFakeCanvas(opts: { hasContext?: boolean; toDataUrlResult?: string } = {}) {
  const fakeImageData = { data: new Uint8ClampedArray(32 * 32 * 4) }
  const ctx = {
    createImageData: vi.fn(() => fakeImageData),
    putImageData: vi.fn(),
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(64 * 64 * 4), width: 64, height: 64 })),
  }
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => opts.hasContext === false ? null : ctx),
    toDataURL: vi.fn(() => opts.toDataUrlResult ?? 'data:image/png;base64,FAKEPNG'),
    _ctx: ctx,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('blurHashToDataUrl', () => {
  let fakeCanvas: ReturnType<typeof makeFakeCanvas>

  beforeEach(() => {
    decodeMock.mockReset()
    encodeMock.mockReset()
    fakeCanvas = makeFakeCanvas()

    vi.spyOn(document, 'createElement').mockImplementation(function (tag: string) {
      if (tag === 'canvas') return fakeCanvas as unknown as HTMLElement
      return document.createElement(tag)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns undefined when blurHash is undefined', () => {
    expect(blurHashToDataUrl(undefined)).toBeUndefined()
  })

  it('returns undefined when blurHash is empty string', () => {
    expect(blurHashToDataUrl('')).toBeUndefined()
  })

  it('returns a data URL when blurHash is valid', () => {
    const pixels = new Uint8ClampedArray(32 * 32 * 4)
    decodeMock.mockReturnValue(pixels)

    const result = blurHashToDataUrl('LEHV6nWB2yk8pyo0adR*.7kCMdnj')
    expect(result).toBe('data:image/png;base64,FAKEPNG')
  })

  it('calls decode with the blurHash and dimensions', () => {
    decodeMock.mockReturnValue(new Uint8ClampedArray(32 * 32 * 4))
    blurHashToDataUrl('LEHV6nWB2yk8pyo0adR*.7kCMdnj')
    expect(decodeMock).toHaveBeenCalledWith('LEHV6nWB2yk8pyo0adR*.7kCMdnj', 32, 32)
  })

  it('uses custom width and height dimensions when provided', () => {
    decodeMock.mockReturnValue(new Uint8ClampedArray(16 * 16 * 4))
    blurHashToDataUrl('some-hash', 16, 16)
    expect(decodeMock).toHaveBeenCalledWith('some-hash', 16, 16)
    expect(fakeCanvas.width).toBe(16)
    expect(fakeCanvas.height).toBe(16)
  })

  it('returns undefined when canvas context is null', () => {
    decodeMock.mockReturnValue(new Uint8ClampedArray(32 * 32 * 4))
    const noCtxCanvas = makeFakeCanvas({ hasContext: false })
    vi.spyOn(document, 'createElement').mockImplementation(function (tag: string) {
      if (tag === 'canvas') return noCtxCanvas as unknown as HTMLElement
      return document.createElement(tag)
    })
    const result = blurHashToDataUrl('LEHV6nWB2yk8pyo0adR*.7kCMdnj')
    expect(result).toBeUndefined()
  })

  it('returns undefined when decode throws an error', () => {
    decodeMock.mockImplementation(() => { throw new Error('invalid hash') })
    const result = blurHashToDataUrl('invalid-hash')
    expect(result).toBeUndefined()
  })

  it('sets pixels on the ImageData and calls putImageData', () => {
    const pixels = new Uint8ClampedArray(32 * 32 * 4).fill(128)
    decodeMock.mockReturnValue(pixels)

    blurHashToDataUrl('LEHV6nWB2yk8pyo0adR*.7kCMdnj')

    expect(fakeCanvas._ctx.putImageData).toHaveBeenCalledOnce()
    expect(fakeCanvas._ctx.putImageData).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.any(Uint8ClampedArray) }),
      0,
      0,
    )
  })
})

describe('generateBlurHash', () => {
  let fakeCanvas: ReturnType<typeof makeFakeCanvas>
  let capturedImg: {
    onload?: () => void
    onerror?: () => void
    src: string
  }

  beforeEach(() => {
    decodeMock.mockReset()
    encodeMock.mockReset()
    fakeCanvas = makeFakeCanvas()

    capturedImg = { src: '' }

    // Mock Image constructor
    vi.stubGlobal('Image', function MockImage(this: typeof capturedImg) {
      capturedImg = this
    })

    // Mock URL.createObjectURL
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:fake-url'),
      revokeObjectURL: vi.fn(),
    })

    vi.spyOn(document, 'createElement').mockImplementation(function (tag: string) {
      if (tag === 'canvas') return fakeCanvas as unknown as HTMLElement
      return document.createElement(tag)
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns a hash string on successful generation', async () => {
    encodeMock.mockReturnValue('LGF5?xYk^6#M@-5c,1J5@[or[Q6.')
    const file = makeFile()

    const promise = generateBlurHash(file)
    // Trigger img.onload
    capturedImg.onload?.()

    const result = await promise
    expect(result).toBe('LGF5?xYk^6#M@-5c,1J5@[or[Q6.')
  })

  it('calls encode with image data', async () => {
    encodeMock.mockReturnValue('hash-value')
    const file = makeFile()

    const promise = generateBlurHash(file)
    capturedImg.onload?.()
    await promise

    expect(encodeMock).toHaveBeenCalledOnce()
    expect(encodeMock).toHaveBeenCalledWith(
      expect.any(Uint8ClampedArray),
      64,
      64,
      4,
      3,
    )
  })

  it('sets img.src to a blob URL', async () => {
    encodeMock.mockReturnValue('h')
    const file = makeFile()

    const promise = generateBlurHash(file)
    capturedImg.onload?.()
    await promise

    expect(capturedImg.src).toBe('blob:fake-url')
  })

  it('returns empty string when img.onerror fires', async () => {
    const file = makeFile()

    const promise = generateBlurHash(file)
    capturedImg.onerror?.()

    const result = await promise
    expect(result).toBe('')
  })

  it('returns empty string when canvas context is null', async () => {
    const noCtxCanvas = makeFakeCanvas({ hasContext: false })
    vi.spyOn(document, 'createElement').mockImplementation(function (tag: string) {
      if (tag === 'canvas') return noCtxCanvas as unknown as HTMLElement
      return document.createElement(tag)
    })

    const file = makeFile()
    const promise = generateBlurHash(file)
    capturedImg.onload?.()

    const result = await promise
    expect(result).toBe('')
  })

  it('returns empty string when encode throws', async () => {
    encodeMock.mockImplementation(() => { throw new Error('encode failed') })
    const file = makeFile()

    const promise = generateBlurHash(file)
    capturedImg.onload?.()

    const result = await promise
    expect(result).toBe('')
  })
})
