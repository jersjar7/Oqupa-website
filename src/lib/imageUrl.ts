// Constructs CDN image URLs from Cloudflare R2 object keys.
//
// Port of Flutter's ImageUrlBuilder. Photo references in Firestore can be:
// - R2 object keys (e.g. `property-photos/abc/123.webp`) — new path
// - Legacy Firebase Storage URLs (starting with `https://`) — backward compat

const PRODUCTION_HOST = 'images.oqupa.com'
const STAGING_HOST = 'images-staging.oqupa.com'

// Image Transformations are enabled on the main zone, not the R2 custom domain.
// Pattern: https://oqupa.com/cdn-cgi/image/{options}/https://images.oqupa.com/{key}
const TRANSFORM_ZONE = 'oqupa.com'

function getHost(): string {
  return import.meta.env.PROD ? PRODUCTION_HOST : STAGING_HOST
}

/** Whether the reference is a legacy Firebase Storage URL (not an R2 key) */
function isLegacyUrl(ref: string): boolean {
  return ref.startsWith('https://')
}

/** Build a CDN URL from an R2 key. Returns legacy URLs unchanged. */
export function buildImageUrl(
  ref: string,
  opts?: { width?: number; quality?: number },
): string {
  if (!ref) return ''
  if (isLegacyUrl(ref)) return ref
  const host = getHost()
  // In production, use Cloudflare Image Transformations via the main zone
  if (import.meta.env.PROD && opts?.width) {
    const q = opts.quality ?? 80
    return `https://${TRANSFORM_ZONE}/cdn-cgi/image/w=${opts.width},f=auto,q=${q}/https://${host}/${ref}`
  }
  return `https://${host}/${ref}`
}

/** 300px thumbnail for listing cards and grids */
export function thumbnail(ref: string): string {
  return buildImageUrl(ref, { width: 300, quality: 80 })
}

/** 400px image for card displays */
export function card(ref: string): string {
  return buildImageUrl(ref, { width: 400, quality: 80 })
}

/** 1200px full-size for detail views and galleries */
export function fullSize(ref: string): string {
  return buildImageUrl(ref, { width: 1200, quality: 85 })
}

/** 400px circular profile photo */
export function profilePhoto(ref: string): string {
  return buildImageUrl(ref, { width: 400, quality: 80 })
}

/** 1080px image for branded share card canvas (exact canvas width) */
export function shareCard(ref: string): string {
  return buildImageUrl(ref, { width: 1080, quality: 85 })
}

export const imageUrl = {
  buildImageUrl,
  thumbnail,
  card,
  fullSize,
  profilePhoto,
  shareCard,
  isLegacyUrl,
}

export default imageUrl
