// @vitest-environment jsdom
/**
 * Tests for the branded card painter.
 *
 * Strategy: mock Canvas 2D API, fetch, and image loading so the pure drawing
 * logic is exercised without a real browser canvas or network.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { BrandedCardConfig } from '../brandedCardConfig'

// ── Canvas mock ──────────────────────────────────────────────────────────────

function makeMockCtx() {
  return {
    fillStyle: '',
    strokeStyle: '',
    font: '',
    textBaseline: '',
    textAlign: '',
    lineWidth: 0,
    fillRect: vi.fn(),
    fillText: vi.fn(),
    strokeRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    drawImage: vi.fn(),
    measureText: vi.fn().mockReturnValue({
      width: 100,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 4,
    }),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    arc: vi.fn(),
  }
}

let mockCtx: ReturnType<typeof makeMockCtx>
let mockCanvas: HTMLCanvasElement & { toBlob: ReturnType<typeof vi.fn> }

// ── fetch mock ───────────────────────────────────────────────────────────────

let fetchMock: ReturnType<typeof vi.fn>

// ── helpers ──────────────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<BrandedCardConfig> = {}): BrandedCardConfig {
  return {
    format: 'story',
    operationLabel: 'SE VENDE',
    propertyType: 'Apto.',
    priceText: 'US$ 180,000',
    specsText: '3 hab. | 2 baños | 120 m²',
    locationText: 'San Eduardo, Piura',
    listingUrl: 'https://oqupa.com/property/abc',
    ...overrides,
  }
}

/** An HTMLImageElement stub with fixed natural dimensions. */
function makeImage(width = 200, height = 200): HTMLImageElement {
  const img = new Image()
  Object.defineProperty(img, 'naturalWidth', { value: width })
  Object.defineProperty(img, 'naturalHeight', { value: height })
  return img
}

// ── controls ─────────────────────────────────────────────────────────────────

/** When true, the img src setter fires onerror instead of onload. */
let imgShouldError = false

// ── setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  imgShouldError = false

  // Canvas context mock
  mockCtx = makeMockCtx()
  mockCanvas = document.createElement('canvas') as HTMLCanvasElement & { toBlob: ReturnType<typeof vi.fn> }
  Object.defineProperty(mockCanvas, 'toBlob', {
    value: vi.fn((cb: (blob: Blob | null) => void) => {
      cb(new Blob(['fake-png'], { type: 'image/png' }))
    }),
    writable: true,
  })

  // Patch createElement to return the mock canvas
  const origCreateElement = document.createElement.bind(document)
  vi.spyOn(document, 'createElement').mockImplementation((tag) => {
    if (tag === 'canvas') return mockCanvas
    // For <img> elements created inside loadImage/loadViaImgElement, we return
    // a real img element but trigger onload/onerror synchronously via a microtask.
    if (tag === 'img') {
      const img = origCreateElement('img')
      // Override src setter to fire onload or onerror based on the control flag
      let _src = ''
      Object.defineProperty(img, 'src', {
        get: () => _src,
        set: (v: string) => {
          _src = v
          if (v && v !== '') {
            Promise.resolve().then(() => {
              if (imgShouldError) {
                img.onerror?.({} as Event)
              } else {
                Object.defineProperty(img, 'naturalWidth', { value: 100, configurable: true })
                Object.defineProperty(img, 'naturalHeight', { value: 100, configurable: true })
                img.onload?.({} as Event)
              }
            })
          }
        },
        configurable: true,
      })
      return img
    }
    return origCreateElement(tag)
  })

  // Mock Canvas context
  vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D)

  // Mock document.fonts.load
  Object.defineProperty(document, 'fonts', {
    value: { load: vi.fn().mockResolvedValue([]) },
    configurable: true,
    writable: true,
  })

  // Mock fetch to return a fake image blob
  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    blob: () =>
      Promise.resolve(new Blob(['fake-image'], { type: 'image/jpeg' })),
  })
  vi.stubGlobal('fetch', fetchMock)

  // Mock URL.createObjectURL / revokeObjectURL
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url')
  vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

// ── tests ─────────────────────────────────────────────────────────────────────

describe('paintBrandedCard', () => {
  it('returns a Blob on success (story format)', async () => {
    const { paintBrandedCard } = await import('../brandedCardPainter')
    const blob = await paintBrandedCard(makeConfig({ format: 'story' }), [])
    expect(blob).toBeInstanceOf(Blob)
  })

  it('returns a Blob on success (square format)', async () => {
    const { paintBrandedCard } = await import('../brandedCardPainter')
    const blob = await paintBrandedCard(makeConfig({ format: 'square' }), [])
    expect(blob).toBeInstanceOf(Blob)
  })

  it('calls fillRect to paint the background', async () => {
    const { paintBrandedCard } = await import('../brandedCardPainter')
    await paintBrandedCard(makeConfig(), [])
    expect(mockCtx.fillRect).toHaveBeenCalled()
  })

  it('calls fillText at least once (text overlay)', async () => {
    const { paintBrandedCard } = await import('../brandedCardPainter')
    await paintBrandedCard(makeConfig(), [])
    expect(mockCtx.fillText).toHaveBeenCalled()
  })

  it('calls drawImage when a photo is loaded successfully', async () => {
    const { paintBrandedCard } = await import('../brandedCardPainter')
    await paintBrandedCard(makeConfig(), ['https://images.oqupa.com/photo.webp'])
    // drawImage may be called for the photo and/or the logo
    expect(mockCtx.drawImage).toHaveBeenCalled()
  })

  it('works with multiple photos', async () => {
    const { paintBrandedCard } = await import('../brandedCardPainter')
    const urls = [
      'https://images.oqupa.com/a.webp',
      'https://images.oqupa.com/b.webp',
    ]
    const blob = await paintBrandedCard(makeConfig(), urls)
    expect(blob).toBeInstanceOf(Blob)
  })

  it('works when no photos are provided (empty array)', async () => {
    const { paintBrandedCard } = await import('../brandedCardPainter')
    const blob = await paintBrandedCard(makeConfig(), [])
    expect(blob).toBeInstanceOf(Blob)
    expect(mockCtx.fillRect).toHaveBeenCalled()
  })

  it('sets canvas dimensions from the layout', async () => {
    const { paintBrandedCard } = await import('../brandedCardPainter')
    await paintBrandedCard(makeConfig({ format: 'story' }), [])
    // story: 1080 × 1920
    expect(mockCanvas.width).toBe(1080)
    expect(mockCanvas.height).toBe(1920)
  })

  it('sets canvas dimensions for square format', async () => {
    const { paintBrandedCard } = await import('../brandedCardPainter')
    await paintBrandedCard(makeConfig({ format: 'square' }), [])
    // square: 1080 × 1080
    expect(mockCanvas.width).toBe(1080)
    expect(mockCanvas.height).toBe(1080)
  })

  it('paints the operation badge text', async () => {
    const { paintBrandedCard } = await import('../brandedCardPainter')
    await paintBrandedCard(makeConfig({ operationLabel: 'SE VENDE' }), [])
    const calls = mockCtx.fillText.mock.calls.map((c) => c[0])
    expect(calls).toContain('SE VENDE')
  })

  it('paints the price text', async () => {
    const { paintBrandedCard } = await import('../brandedCardPainter')
    await paintBrandedCard(makeConfig({ priceText: 'US$ 180,000' }), [])
    const calls = mockCtx.fillText.mock.calls.map((c) => c[0])
    expect(calls).toContain('US$ 180,000')
  })

  it('paints the specs text (or part thereof)', async () => {
    const { paintBrandedCard } = await import('../brandedCardPainter')
    await paintBrandedCard(makeConfig({ specsText: '3 hab. | 2 baños | 120 m²' }), [])
    const calls = mockCtx.fillText.mock.calls.map((c) => String(c[0]))
    const allText = calls.join(' ')
    // The specs text may be rendered in one call or split; check for presence of key parts.
    expect(allText).toContain('hab.')
    expect(allText).toContain('m²')
  })

  it('paints the location text', async () => {
    const { paintBrandedCard } = await import('../brandedCardPainter')
    await paintBrandedCard(makeConfig({ locationText: 'San Eduardo, Piura' }), [])
    const calls = mockCtx.fillText.mock.calls.map((c) => c[0])
    expect(calls).toContain('San Eduardo, Piura')
  })

  it('throws when toBlob returns null (canvas error)', async () => {
    mockCanvas.toBlob = vi.fn((cb: (blob: Blob | null) => void) => cb(null))
    const { paintBrandedCard } = await import('../brandedCardPainter')
    await expect(paintBrandedCard(makeConfig(), [])).rejects.toThrow('Failed to generate card image')
  })

  it('is not affected by a failed photo fetch (gracefully skips)', async () => {
    fetchMock.mockRejectedValue(new Error('network error'))
    const { paintBrandedCard } = await import('../brandedCardPainter')
    // Should resolve to a Blob even if photo loading fails
    const blob = await paintBrandedCard(makeConfig(), ['https://images.oqupa.com/photo.webp'])
    expect(blob).toBeInstanceOf(Blob)
  })

  it('loads fonts before painting', async () => {
    const { paintBrandedCard } = await import('../brandedCardPainter')
    const fontSpy = vi.spyOn(document.fonts as unknown as { load: (...args: unknown[]) => unknown }, 'load')
    await paintBrandedCard(makeConfig(), [])
    expect(fontSpy).toHaveBeenCalled()
  })

  it('handles cdn-cgi photo URL — all tiers fail, skips photo gracefully', async () => {
    // Tier 1 & Tier 3 fetch fail; Tier 2 & Tier 4 img fail (onerror).
    // This exercises lines 101-102 (onerror in loadViaImgElement) and 138-149 (Tier 3 path).
    fetchMock.mockRejectedValue(new Error('CORS blocked'))
    imgShouldError = true
    const { paintBrandedCard } = await import('../brandedCardPainter')
    const cdnUrl = 'https://images.oqupa.com/cdn-cgi/image/width=800/https://images.oqupa.com/photos/abc.webp'
    const blob = await paintBrandedCard(makeConfig(), [cdnUrl])
    expect(blob).toBeInstanceOf(Blob)
  })

  it('handles cdn-cgi URL where direct URL has a relative path source — all tiers fail', async () => {
    // cdn-cgi URL where the source after /cdn-cgi/image/<opts>/ is a relative path
    fetchMock.mockRejectedValue(new Error('network error'))
    imgShouldError = true
    const { paintBrandedCard } = await import('../brandedCardPainter')
    const cdnUrl = 'https://images.oqupa.com/cdn-cgi/image/width=800/photos/abc.webp'
    const blob = await paintBrandedCard(makeConfig(), [cdnUrl])
    expect(blob).toBeInstanceOf(Blob)
  })

  it('handles img onerror in Tier 2 (loadViaImgElement) for non-cdn-cgi URL', async () => {
    // Tier 1 fetch fails (ok=false) → Tier 2 img onerror fires.
    // This exercises lines 101-102 of loadViaImgElement and the null return of loadImage.
    fetchMock.mockResolvedValue({ ok: false })
    imgShouldError = true
    const { paintBrandedCard } = await import('../brandedCardPainter')
    const blob = await paintBrandedCard(makeConfig(), ['https://images.oqupa.com/photo.webp'])
    expect(blob).toBeInstanceOf(Blob)
  })

  it('handles a 404 fetch response for a photo (ok=false path)', async () => {
    // fetchAsBlob: response.ok is false → returns null → falls through to img element
    fetchMock.mockResolvedValue({ ok: false })
    const { paintBrandedCard } = await import('../brandedCardPainter')
    const blob = await paintBrandedCard(makeConfig(), ['https://images.oqupa.com/missing.webp'])
    expect(blob).toBeInstanceOf(Blob)
  })

  it('uses SE ALQUILA as the operation badge text', async () => {
    const { paintBrandedCard } = await import('../brandedCardPainter')
    await paintBrandedCard(makeConfig({ operationLabel: 'SE ALQUILA' }), [])
    const calls = mockCtx.fillText.mock.calls.map((c) => c[0])
    expect(calls).toContain('SE ALQUILA')
  })

  it('paints a subtitle (Ver más en oqupa.com) for the logo area', async () => {
    const { paintBrandedCard } = await import('../brandedCardPainter')
    await paintBrandedCard(makeConfig(), [])
    const allText = mockCtx.fillText.mock.calls.map((c) => String(c[0])).join(' ')
    expect(allText).toContain('oqupa.com')
  })
})
