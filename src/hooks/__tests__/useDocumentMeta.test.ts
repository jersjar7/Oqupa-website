// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { useDocumentMeta } from '@/hooks/useDocumentMeta'

// Clean up any tags the hook added between tests so each test starts fresh.
afterEach(() => {
  document.title = 'Oqupa'
  document.querySelectorAll('meta[property], meta[name], link[rel="canonical"]').forEach(el => el.remove())
})

describe('useDocumentMeta', () => {
  it('sets document.title to the given title', () => {
    renderHook(() => useDocumentMeta({ title: 'Casa en Piura | Oqupa' }))
    expect(document.title).toBe('Casa en Piura | Oqupa')
  })

  it('resets document.title to "Oqupa" on unmount', () => {
    const { unmount } = renderHook(() => useDocumentMeta({ title: 'Casa en Piura | Oqupa' }))
    unmount()
    expect(document.title).toBe('Oqupa')
  })

  describe('description', () => {
    it('sets description, og:description, and twitter:description when provided', () => {
      renderHook(() => useDocumentMeta({ title: 'Test', description: 'Una descripción' }))
      expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe('Una descripción')
      expect(document.querySelector('meta[property="og:description"]')?.getAttribute('content')).toBe('Una descripción')
      expect(document.querySelector('meta[name="twitter:description"]')?.getAttribute('content')).toBe('Una descripción')
    })

    it('does not create description tags when description is omitted', () => {
      renderHook(() => useDocumentMeta({ title: 'Test' }))
      expect(document.querySelector('meta[name="description"]')).toBeNull()
      expect(document.querySelector('meta[property="og:description"]')).toBeNull()
      expect(document.querySelector('meta[name="twitter:description"]')).toBeNull()
    })
  })

  describe('image', () => {
    it('sets og:image and twitter:image when provided', () => {
      renderHook(() => useDocumentMeta({ title: 'Test', image: 'https://example.com/photo.jpg' }))
      expect(document.querySelector('meta[property="og:image"]')?.getAttribute('content')).toBe('https://example.com/photo.jpg')
      expect(document.querySelector('meta[name="twitter:image"]')?.getAttribute('content')).toBe('https://example.com/photo.jpg')
    })

    it('does not create image tags when image is omitted', () => {
      renderHook(() => useDocumentMeta({ title: 'Test' }))
      expect(document.querySelector('meta[property="og:image"]')).toBeNull()
      expect(document.querySelector('meta[name="twitter:image"]')).toBeNull()
    })
  })

  describe('canonical URL', () => {
    it('sets the canonical link and og:url to the provided url', () => {
      renderHook(() => useDocumentMeta({ title: 'Test', url: 'https://oqupa.com/propiedades/abc' }))
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://oqupa.com/propiedades/abc')
      expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe('https://oqupa.com/propiedades/abc')
    })

    it('falls back to window.location.pathname when url is omitted', () => {
      renderHook(() => useDocumentMeta({ title: 'Test' }))
      const expected = `https://oqupa.com${window.location.pathname}`
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(expected)
    })

    it('does not set og:url when url is omitted', () => {
      renderHook(() => useDocumentMeta({ title: 'Test' }))
      expect(document.querySelector('meta[property="og:url"]')).toBeNull()
    })
  })

  describe('no duplicate tags', () => {
    it('updates an existing tag instead of creating a second one', () => {
      const { rerender } = renderHook(({ title }) => useDocumentMeta({ title }), {
        initialProps: { title: 'Título original' },
      })
      rerender({ title: 'Título actualizado' })
      const tags = document.querySelectorAll('meta[property="og:title"]')
      expect(tags).toHaveLength(1)
      expect(tags[0]?.getAttribute('content')).toBe('Título actualizado')
    })
  })

  describe('always-set meta tags', () => {
    it('sets og:title', () => {
      renderHook(() => useDocumentMeta({ title: 'Test' }))
      expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe('Test')
    })

    it('sets og:type to "website"', () => {
      renderHook(() => useDocumentMeta({ title: 'Test' }))
      expect(document.querySelector('meta[property="og:type"]')?.getAttribute('content')).toBe('website')
    })

    it('sets og:site_name to "Oqupa"', () => {
      renderHook(() => useDocumentMeta({ title: 'Test' }))
      expect(document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')).toBe('Oqupa')
    })

    it('sets twitter:card to "summary_large_image"', () => {
      renderHook(() => useDocumentMeta({ title: 'Test' }))
      expect(document.querySelector('meta[name="twitter:card"]')?.getAttribute('content')).toBe('summary_large_image')
    })

    it('sets twitter:title', () => {
      renderHook(() => useDocumentMeta({ title: 'Test' }))
      expect(document.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe('Test')
    })
  })
})
