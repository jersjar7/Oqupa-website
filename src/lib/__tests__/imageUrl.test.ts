import { describe, it, expect } from 'vitest'
import { buildImageUrl, thumbnail, card, fullSize, profilePhoto, shareCard, imageUrl } from '../imageUrl'

// By default, Vitest sets import.meta.env.PROD = false (dev/test mode),
// so getHost() returns the staging host.
const STAGING_HOST = 'images-staging.oqupa.com'
const PRODUCTION_HOST = 'images.oqupa.com'

describe('imageUrl', () => {
  // ─── buildImageUrl ──────────────────────────────────────────────────

  describe('buildImageUrl', () => {
    it('constructs a URL with host and key', () => {
      const url = buildImageUrl('property-photos/abc/123.webp', { width: 300 })
      expect(url).toBe(
        `https://${STAGING_HOST}/property-photos/abc/123.webp`,
      )
    })

    it('constructs a URL ignoring width/quality (no Image Transformations)', () => {
      const url = buildImageUrl('property-photos/abc/123.webp', {
        width: 1200,
        quality: 90,
      })
      expect(url).toBe(
        `https://${STAGING_HOST}/property-photos/abc/123.webp`,
      )
    })

    it('constructs a plain URL when no opts provided', () => {
      const url = buildImageUrl('property-photos/abc/123.webp')
      expect(url).toBe(
        `https://${STAGING_HOST}/property-photos/abc/123.webp`,
      )
    })

    it('returns legacy Firebase Storage URLs unchanged', () => {
      const legacy =
        'https://firebasestorage.googleapis.com/v0/b/oqupa-production.appspot.com/o/photo.jpg'
      expect(buildImageUrl(legacy, { width: 300 })).toBe(legacy)
    })

    it('returns any https:// URL unchanged (general legacy)', () => {
      const externalUrl = 'https://example.com/image.png'
      expect(buildImageUrl(externalUrl, { width: 400 })).toBe(externalUrl)
    })

    it('returns empty string for empty ref', () => {
      expect(buildImageUrl('', { width: 300 })).toBe('')
    })

    it('handles R2 keys with nested paths', () => {
      const key = 'profile-photos/user123/avatar.webp'
      const url = buildImageUrl(key, { width: 400 })
      expect(url).toBe(
        `https://${STAGING_HOST}/${key}`,
      )
    })

    it('handles R2 keys with special characters in filename', () => {
      const key = 'property-photos/abc/photo (1).webp'
      const url = buildImageUrl(key, { width: 300 })
      expect(url).toContain(key)
      expect(url.startsWith(`https://${STAGING_HOST}/`)).toBe(true)
    })
  })

  // ─── isLegacyUrl ───────────────────────────────────────────────────

  describe('isLegacyUrl', () => {
    it('detects https:// URLs as legacy', () => {
      expect(imageUrl.isLegacyUrl('https://firebasestorage.googleapis.com/v0/b/...')).toBe(true)
    })

    it('detects any https:// URL as legacy', () => {
      expect(imageUrl.isLegacyUrl('https://example.com/photo.jpg')).toBe(true)
    })

    it('does not flag R2 object keys as legacy', () => {
      expect(imageUrl.isLegacyUrl('property-photos/abc/123.webp')).toBe(false)
    })

    it('does not flag empty string as legacy', () => {
      expect(imageUrl.isLegacyUrl('')).toBe(false)
    })

    it('does not flag http:// (non-https) as legacy', () => {
      // The implementation only checks for https://, not http://
      expect(imageUrl.isLegacyUrl('http://example.com/photo.jpg')).toBe(false)
    })
  })

  // ─── Preset methods ────────────────────────────────────────────────

  describe('thumbnail', () => {
    it('constructs URL with host and key', () => {
      const url = thumbnail('photos/abc.webp')
      expect(url).toBe(
        `https://${STAGING_HOST}/photos/abc.webp`,
      )
    })

    it('returns legacy URLs unchanged', () => {
      const legacy = 'https://storage.example.com/photo.jpg'
      expect(thumbnail(legacy)).toBe(legacy)
    })

    it('returns empty string for empty ref', () => {
      expect(thumbnail('')).toBe('')
    })
  })

  describe('card', () => {
    it('constructs URL with host and key', () => {
      const url = card('photos/abc.webp')
      expect(url).toBe(
        `https://${STAGING_HOST}/photos/abc.webp`,
      )
    })

    it('returns legacy URLs unchanged', () => {
      const legacy = 'https://storage.example.com/photo.jpg'
      expect(card(legacy)).toBe(legacy)
    })

    it('returns empty string for empty ref', () => {
      expect(card('')).toBe('')
    })
  })

  describe('fullSize', () => {
    it('constructs URL with host and key', () => {
      const url = fullSize('photos/abc.webp')
      expect(url).toBe(
        `https://${STAGING_HOST}/photos/abc.webp`,
      )
    })

    it('returns legacy URLs unchanged', () => {
      const legacy = 'https://storage.example.com/photo.jpg'
      expect(fullSize(legacy)).toBe(legacy)
    })

    it('returns empty string for empty ref', () => {
      expect(fullSize('')).toBe('')
    })
  })

  describe('profilePhoto', () => {
    it('constructs URL with host and key', () => {
      const url = profilePhoto('profile-photos/user1/avatar.webp')
      expect(url).toBe(
        `https://${STAGING_HOST}/profile-photos/user1/avatar.webp`,
      )
    })

    it('returns legacy URLs unchanged', () => {
      const legacy = 'https://storage.example.com/avatar.jpg'
      expect(profilePhoto(legacy)).toBe(legacy)
    })

    it('returns empty string for empty ref', () => {
      expect(profilePhoto('')).toBe('')
    })
  })

  describe('shareCard', () => {
    it('constructs URL with host and key', () => {
      const url = shareCard('photos/abc.webp')
      expect(url).toBe(
        `https://${STAGING_HOST}/photos/abc.webp`,
      )
    })

    it('returns legacy URLs unchanged', () => {
      const legacy = 'https://storage.example.com/photo.jpg'
      expect(shareCard(legacy)).toBe(legacy)
    })

    it('returns empty string for empty ref', () => {
      expect(shareCard('')).toBe('')
    })
  })

  // ─── URL format verification ─────────────────────────────────────

  describe('URL format', () => {
    it('follows the https://{host}/{key} pattern', () => {
      const url = buildImageUrl('photos/test.webp', { width: 500, quality: 75 })
      const pattern = /^https:\/\/[^/]+\/.+$/
      expect(url).toMatch(pattern)
    })

    it('uses the staging host in test/dev environment', () => {
      const url = buildImageUrl('photos/test.webp', { width: 300 })
      expect(url).toContain(STAGING_HOST)
      expect(url).not.toContain(PRODUCTION_HOST)
    })

    it('does not include cdn-cgi prefix', () => {
      const url = buildImageUrl('photos/test.webp', { width: 300 })
      expect(url).not.toContain('cdn-cgi')
    })

    it('URL is simply host plus key', () => {
      const url = buildImageUrl('photos/test.webp', { width: 800, quality: 70 })
      expect(url).toBe(`https://${STAGING_HOST}/photos/test.webp`)
    })

    it('appends the R2 object key as the path suffix', () => {
      const key = 'property-photos/listing123/photo1.webp'
      const url = buildImageUrl(key, { width: 300 })
      expect(url.endsWith(`/${key}`)).toBe(true)
    })
  })

  // ─── Default export object ─────────────────────────────────────────

  describe('default export', () => {
    it('exposes all methods on the imageUrl object', () => {
      expect(imageUrl.buildImageUrl).toBe(buildImageUrl)
      expect(imageUrl.thumbnail).toBe(thumbnail)
      expect(imageUrl.card).toBe(card)
      expect(imageUrl.fullSize).toBe(fullSize)
      expect(imageUrl.profilePhoto).toBe(profilePhoto)
      expect(imageUrl.shareCard).toBe(shareCard)
      expect(typeof imageUrl.isLegacyUrl).toBe('function')
    })
  })
})
