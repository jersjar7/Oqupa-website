// Canvas painter for branded listing card images.
//
// Port of Flutter's BrandedCardPainter. Pure function using HTML Canvas 2D API.
// All positioning and sizing delegated to CardLayout constants.

import type { BrandedCardConfig } from './brandedCardConfig'
import type { CardLayout } from './cardLayout'
import { getLayout } from './cardLayout'
import logoUrl from '@/assets/images/Oqupa_FullLogo_multicolor.webp'

// Brand colors (matching Flutter AppColors)
const COLOR_BRICK_ORANGE = '#F47843'
const COLOR_PACIFIC_GREEN = '#3A6A55'
const COLOR_CREAM_LIGHT = '#FFFAF5'

// Font family (must match index.css @font-face declarations)
const FONT_FAMILY = 'Gotham'

function gothamBold(size: number): string {
  return `700 ${size}px '${FONT_FAMILY}'`
}

function gothamMedium(size: number): string {
  return `500 ${size}px '${FONT_FAMILY}'`
}

function gothamBook(size: number): string {
  return `400 ${size}px '${FONT_FAMILY}'`
}

/**
 * In dev mode, rewrites Firebase Storage URLs to go through Vite's proxy
 * to avoid CORS issues. In production, uses the URL as-is (same-origin
 * or CORS-allowed).
 */
function resolveUrl(url: string): string {
  if (
    import.meta.env.DEV &&
    url.includes('firebasestorage.googleapis.com')
  ) {
    return url.replace('https://firebasestorage.googleapis.com', '/__storage')
  }
  return url
}

/**
 * Strips the Cloudflare cdn-cgi/image/ prefix from a URL, returning the
 * direct image URL. Returns the original URL if no prefix is present.
 */
function stripCdnCgi(url: string): string {
  const match = url.match(/\/cdn-cgi\/image\/[^/]+\/(.+)$/)
  if (!match?.[1]) return url
  const source = match[1]
  // Source is a full URL (e.g. https://images.oqupa.com/key) — return as-is
  if (source.startsWith('https://')) return source
  // Source is a relative path — prepend the host
  const hostMatch = url.match(/^(https:\/\/[^/]+)/)
  return hostMatch?.[1] ? `${hostMatch[1]}/${source}` : url
}

/** Loads an image via fetch-as-blob with an AbortController timeout. */
async function fetchAsBlob(url: string, timeoutMs: number): Promise<HTMLImageElement | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const fetchUrl = resolveUrl(url)
    const response = await fetch(fetchUrl, { signal: controller.signal })
    if (!response.ok) return null
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    return await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => {
        URL.revokeObjectURL(blobUrl)
        resolve(null)
      }
      img.src = blobUrl
    })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Loads an image via an <img> element with crossOrigin (browser-native loader). */
async function loadViaImgElement(url: string, timeoutMs: number): Promise<HTMLImageElement | null> {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const timer = setTimeout(() => {
      img.src = ''
      resolve(null)
    }, timeoutMs)
    img.onload = () => {
      clearTimeout(timer)
      resolve(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    img.src = url
  })
}

/**
 * Loads an image as a canvas-safe HTMLImageElement with 3-tier fallback:
 *
 * 1. fetch() as blob with 15s timeout (avoids CORS taint)
 * 2. <img crossOrigin="anonymous"> (browser-native, better on mobile)
 * 3. If URL has cdn-cgi, retry 1-2 with the direct R2 URL
 *
 * For local/asset URLs, loads directly without the fallback chain.
 */
async function loadImage(url: string, useFallbackChain = true): Promise<HTMLImageElement | null> {
  // Local/asset URLs: load directly
  if (!useFallbackChain || !(url.startsWith('http') || url.startsWith('/__storage'))) {
    return new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = url
    })
  }

  try {
    // Tier 1: fetch as blob
    const result1 = await fetchAsBlob(url, 15_000)
    if (result1) return result1

    // Tier 2: <img> element with crossOrigin
    const result2 = await loadViaImgElement(url, 15_000)
    if (result2) return result2

    // Tier 3: if cdn-cgi URL, retry with direct R2 URL
    const directUrl = stripCdnCgi(url)
    if (directUrl !== url) {
      const result3 = await fetchAsBlob(directUrl, 15_000)
      if (result3) return result3

      const result4 = await loadViaImgElement(directUrl, 15_000)
      if (result4) return result4
    }

    return null
  } catch {
    return null
  }
}

/** Measures text width using an offscreen canvas context. */
function measureText(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
): { width: number; height: number } {
  ctx.font = font
  const metrics = ctx.measureText(text)
  const height =
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
  return { width: metrics.width, height }
}

/** Draws a photo into a target rect using BoxFit.cover (scale to fill, center, clip). */
function drawPhotoCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const scaledW = img.naturalWidth * scale
  const scaledH = img.naturalHeight * scale
  const dx = x + (w - scaledW) / 2
  const dy = y + (h - scaledH) / 2

  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(img, dx, dy, scaledW, scaledH)
  ctx.restore()
}

/**
 * Generates a branded listing card image as a PNG Blob.
 *
 * Loads photos from the provided URLs + the Oqupa logo asset,
 * paints everything onto an offscreen canvas, and exports as PNG.
 */
export async function paintBrandedCard(
  config: BrandedCardConfig,
  photoUrls: string[],
): Promise<Blob> {
  const layout = getLayout(config.format)

  // Ensure fonts are loaded before painting
  await document.fonts.load(gothamBold(layout.priceFontSize))
  await document.fonts.load(gothamMedium(layout.specsFontSize))
  await document.fonts.load(gothamBook(layout.locationFontSize))

  // Load photos and logo in parallel
  const maxPhotos = Math.min(photoUrls.length, layout.maxPhotos)
  const photoPromises = photoUrls.slice(0, maxPhotos).map((url) => loadImage(url))
  const logoPromise = loadImage(logoUrl, false)

  const [photos, logo] = await Promise.all([
    Promise.all(photoPromises),
    logoPromise,
  ])

  const loadedPhotos = photos.filter(
    (img): img is HTMLImageElement => img !== null,
  )

  // Create offscreen canvas
  const canvas = document.createElement('canvas')
  canvas.width = layout.width
  canvas.height = layout.height
  const ctx = canvas.getContext('2d')!

  // 1. Solid background
  ctx.fillStyle = COLOR_CREAM_LIGHT
  ctx.fillRect(0, 0, layout.width, layout.height)

  // 2. Photo strips (stacked vertically, BoxFit.cover each)
  if (loadedPhotos.length > 0) {
    const stripHeight = layout.height / loadedPhotos.length
    for (let i = 0; i < loadedPhotos.length; i++) {
      const photo = loadedPhotos[i]
      if (photo) drawPhotoCover(ctx, photo, 0, stripHeight * i, layout.width, stripHeight)
    }
  }

  // 3. Semi-transparent dark background behind bottom text
  const bgTop = computeTextBackgroundTop(ctx, layout, config)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
  ctx.fillRect(0, bgTop, layout.width, layout.height - bgTop)

  // 4. Operation badge (top-left)
  paintBadge(ctx, layout, config.operationLabel)

  // 5. Text overlay (price, specs, location — bottom-left)
  paintTextOverlay(ctx, layout, config)

  // 6. Logo overlay (bottom-right)
  if (logo) {
    paintLogo(ctx, layout, logo)
  }

  // Export as PNG blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to generate card image'))
      },
      'image/png',
    )
  })
}

function computeTextBackgroundTop(
  ctx: CanvasRenderingContext2D,
  layout: CardLayout,
  config: BrandedCardConfig,
): number {
  const maxTextWidth = layout.width - layout.textBackgroundPaddingH * 2

  const priceMetrics = measureText(
    ctx,
    config.priceText,
    gothamBold(layout.priceFontSize),
  )
  const specsMetrics = measureText(
    ctx,
    `${config.propertyType} · ${config.specsText}`,
    gothamMedium(layout.specsFontSize),
  )
  const locationMetrics = measureText(
    ctx,
    config.locationText,
    gothamBook(layout.locationFontSize),
  )

  // Suppress unused variable warnings — maxTextWidth is kept for
  // future multi-line text support, matching the Flutter implementation
  void maxTextWidth

  const totalTextHeight =
    priceMetrics.height +
    layout.priceToSpecsGap +
    specsMetrics.height +
    layout.specsToLocationGap +
    locationMetrics.height

  const bgHeight = totalTextHeight + layout.textBackgroundPaddingV * 2
  return layout.height - bgHeight
}

function paintBadge(
  ctx: CanvasRenderingContext2D,
  layout: CardLayout,
  label: string,
): void {
  const isVenta = label === 'SE VENDE'
  const badgeColor = isVenta ? COLOR_BRICK_ORANGE : COLOR_PACIFIC_GREEN
  const font = gothamBold(layout.badgeFontSize)

  ctx.font = font
  ctx.letterSpacing = `${layout.badgeLetterSpacing}px`
  const metrics = ctx.measureText(label)
  const textHeight =
    metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent

  const badgeWidth = metrics.width + layout.badgePaddingH * 2
  const badgeHeight = textHeight + layout.badgePaddingV * 2

  // Draw rounded rect badge
  const x = layout.badgeLeft
  const y = layout.badgeTop
  const r = layout.badgeRadius
  ctx.fillStyle = badgeColor
  ctx.beginPath()
  ctx.roundRect(x, y, badgeWidth, badgeHeight, r)
  ctx.fill()

  // Draw text centered vertically in the badge
  ctx.fillStyle = '#FFFFFF'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, x + layout.badgePaddingH, y + badgeHeight / 2)

  // Reset letter spacing
  ctx.letterSpacing = '0px'
}

function paintTextOverlay(
  ctx: CanvasRenderingContext2D,
  layout: CardLayout,
  config: BrandedCardConfig,
): void {
  const specsLine = `${config.propertyType} · ${config.specsText}`

  // Measure all text lines
  const priceFont = gothamBold(layout.priceFontSize)
  const specsFont = gothamMedium(layout.specsFontSize)
  const locationFont = gothamBook(layout.locationFontSize)

  const locationMetrics = measureText(ctx, config.locationText, locationFont)
  const specsMetrics = measureText(ctx, specsLine, specsFont)
  const priceMetrics = measureText(ctx, config.priceText, priceFont)

  // Position from bottom up
  const locationY =
    layout.height - layout.textBackgroundPaddingV - locationMetrics.height
  const specsY =
    locationY - layout.specsToLocationGap - specsMetrics.height
  const priceY =
    specsY - layout.priceToSpecsGap - priceMetrics.height

  ctx.textBaseline = 'top'

  // Price
  ctx.font = priceFont
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText(config.priceText, layout.textBackgroundPaddingH, priceY)

  // Specs
  ctx.font = specsFont
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.fillText(specsLine, layout.textBackgroundPaddingH, specsY)

  // Location
  ctx.font = locationFont
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
  ctx.fillText(config.locationText, layout.textBackgroundPaddingH, locationY)
}

function paintLogo(
  ctx: CanvasRenderingContext2D,
  layout: CardLayout,
  logo: HTMLImageElement,
): void {
  // Measure subtitle
  const subtitleFont = gothamBook(layout.logoSubtitleFontSize)
  const subtitleText = 'Ver más en oqupa.com'
  const subtitleMetrics = measureText(ctx, subtitleText, subtitleFont)

  // Position subtitle from bottom edge
  const subtitleY =
    layout.height - layout.logoBottom - subtitleMetrics.height

  // Position logo above subtitle
  const targetH = layout.logoHeight
  const targetW = logo.naturalWidth * (targetH / logo.naturalHeight)
  const logoY = subtitleY - layout.logoToSubtitleGap - targetH

  // Right-align both elements to the same right edge
  const rightEdge = layout.width - layout.logoRight
  const logoX = rightEdge - targetW

  ctx.drawImage(logo, logoX, logoY, targetW, targetH)

  // Use textAlign='right' for precise right-alignment with the logo
  ctx.font = subtitleFont
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.textBaseline = 'top'
  ctx.textAlign = 'right'
  ctx.fillText(subtitleText, rightEdge, subtitleY)
  ctx.textAlign = 'left' // reset
}
