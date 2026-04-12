// Constructs CDN image URLs from Cloudflare R2 object keys.
//
// Port of Flutter's ImageUrlBuilder. Photo references in Firestore can be:
// - R2 object keys (e.g. `property-photos/abc/123.webp`) — new path
// - Legacy Firebase Storage URLs (starting with `https://`) — backward compat

const PRODUCTION_HOST = 'images.oqupa.com'
const STAGING_HOST = 'images-staging.oqupa.com'

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
  _opts?: { width?: number; quality?: number },
): string {
  if (!ref) return ''
  if (isLegacyUrl(ref)) return ref
  return `https://${getHost()}/${ref}`
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

export const imageUrl = {
  buildImageUrl,
  thumbnail,
  card,
  fullSize,
  profilePhoto,
  isLegacyUrl,
}

export default imageUrl
