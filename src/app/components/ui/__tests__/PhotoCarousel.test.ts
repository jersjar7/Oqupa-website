// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { computeNextIndex } from '../PhotoCarousel'

// Mock the image URL builder so tests stay hermetic (don't depend on the
// host/env detection in imageUrl.ts).
vi.mock('@/lib/imageUrl', () => ({
  card: (ref: string) => `https://cdn.test/${ref}`,
}))

// Mock blurhashToDataUrl — we just need it to not explode.
vi.mock('@/lib/blurhash', () => ({
  blurHashToDataUrl: (_hash: string | undefined) => undefined,
}))

const { default: PhotoCarousel } = await import('../PhotoCarousel')

describe('computeNextIndex', () => {
  it('wraps forward past the last photo', () => {
    expect(computeNextIndex(2, +1, 3)).toBe(0)
  })

  it('wraps backward before the first photo', () => {
    expect(computeNextIndex(0, -1, 3)).toBe(2)
  })

  it('stays put for a single photo', () => {
    expect(computeNextIndex(0, +1, 1)).toBe(0)
    expect(computeNextIndex(0, -1, 1)).toBe(0)
  })

  it('returns 0 when count is 0', () => {
    expect(computeNextIndex(0, +1, 0)).toBe(0)
  })

  it('handles multi-step deltas', () => {
    expect(computeNextIndex(0, +5, 3)).toBe(2)
    expect(computeNextIndex(0, -4, 3)).toBe(2)
  })
})

describe('<PhotoCarousel>', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders "Sin imagen" when photos is empty', () => {
    render(React.createElement(PhotoCarousel, { photos: [], alt: 'empty' }))
    expect(screen.getByText('Sin imagen')).toBeDefined()
  })

  it('renders a single image without navigation controls', () => {
    render(React.createElement(PhotoCarousel, { photos: ['a.webp'], alt: 'only' }))
    const img = screen.getByAltText(/only · foto 1 de 1/) as HTMLImageElement
    expect(img.src).toBe('https://cdn.test/a.webp')
    expect(screen.queryByLabelText('Foto anterior')).toBeNull()
    expect(screen.queryByLabelText('Foto siguiente')).toBeNull()
  })

  it('renders prev/next buttons when there are 2+ photos', () => {
    render(React.createElement(PhotoCarousel, { photos: ['a.webp', 'b.webp'], alt: 'pair' }))
    expect(screen.getByLabelText('Foto anterior')).toBeDefined()
    expect(screen.getByLabelText('Foto siguiente')).toBeDefined()
  })

  it('advances to the next photo on "next" click', () => {
    render(React.createElement(PhotoCarousel, { photos: ['a.webp', 'b.webp', 'c.webp'], alt: 'trio' }))
    const nextBtn = screen.getByLabelText('Foto siguiente')
    fireEvent.click(nextBtn)
    const img = screen.getByAltText(/trio · foto 2 de 3/) as HTMLImageElement
    expect(img.src).toBe('https://cdn.test/b.webp')
  })

  it('wraps forward from last to first', () => {
    render(React.createElement(PhotoCarousel, { photos: ['a.webp', 'b.webp'], alt: 'wrap' }))
    const nextBtn = screen.getByLabelText('Foto siguiente')
    fireEvent.click(nextBtn) // now at index 1
    fireEvent.click(nextBtn) // wraps to 0
    const img = screen.getByAltText(/wrap · foto 1 de 2/) as HTMLImageElement
    expect(img.src).toBe('https://cdn.test/a.webp')
  })

  it('goes back with "prev" (and wraps from first to last)', () => {
    render(React.createElement(PhotoCarousel, { photos: ['a.webp', 'b.webp', 'c.webp'], alt: 'back' }))
    const prevBtn = screen.getByLabelText('Foto anterior')
    fireEvent.click(prevBtn) // 0 → 2 (wrap)
    const img = screen.getByAltText(/back · foto 3 de 3/) as HTMLImageElement
    expect(img.src).toBe('https://cdn.test/c.webp')
  })

  it('calls onSlideChange with the new index', () => {
    const onSlideChange = vi.fn()
    render(React.createElement(PhotoCarousel, {
      photos: ['a.webp', 'b.webp'], alt: 'cb', onSlideChange,
    }))
    fireEvent.click(screen.getByLabelText('Foto siguiente'))
    expect(onSlideChange).toHaveBeenCalledTimes(1)
    expect(onSlideChange).toHaveBeenCalledWith(1)
  })

  it('is keyboard-navigable with ArrowLeft / ArrowRight', () => {
    const { container } = render(React.createElement(PhotoCarousel, {
      photos: ['a.webp', 'b.webp'], alt: 'keys',
    }))
    const region = container.querySelector('[role="region"]') as HTMLElement
    expect(region).not.toBeNull()
    fireEvent.keyDown(region, { key: 'ArrowRight' })
    const img = screen.getByAltText(/keys · foto 2 de 2/) as HTMLImageElement
    expect(img.src).toBe('https://cdn.test/b.webp')
  })

  it('accepts className on the outer container (parent controls height)', () => {
    const { container } = render(React.createElement(PhotoCarousel, {
      photos: ['a.webp'], alt: 'classed', className: 'h-48 custom-class',
    }))
    const outer = container.firstChild as HTMLElement
    expect(outer.className).toMatch(/h-48/)
    expect(outer.className).toMatch(/custom-class/)
  })
})
