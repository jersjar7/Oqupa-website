// @vitest-environment jsdom
/**
 * Tests for the explore/PhotoCarousel component.
 *
 * This component wraps useGallery and renders a swipeable photo track with
 * prev/next arrows and dot indicators. We test the key branches: zero photos,
 * one photo (no controls), and multiple photos (arrows + dots).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useGallery', () => ({
  useGallery: vi.fn(() => ({
    currentSlide: 0,
    next: vi.fn(),
    prev: vi.fn(),
    goTo: vi.fn(),
    onTouchStart: vi.fn(),
    onTouchEnd: vi.fn(),
  })),
}))

vi.mock('@/lib/imageUrl', () => ({
  card: (ref: string) => `https://images.test/${ref}-card`,
}))

const mockBlurHashToDataUrl = vi.hoisted(() =>
  vi.fn((hash: string | undefined) =>
    hash ? `data:image/png;base64,fake-${hash}` : null
  )
)

vi.mock('@/lib/blurhash', () => ({
  blurHashToDataUrl: mockBlurHashToDataUrl,
}))

vi.mock('@/app/components/ui', () => ({
  AnimatedImage: ({ src, alt, className, loading }: { src: string; alt: string; className?: string; loading?: 'eager' | 'lazy' }) => (
    <img src={src} alt={alt} className={className} loading={loading} data-testid="animated-image" />
  ),
}))

// ── Import after mocks ───────────────────────────────────────────────────────

import PhotoCarousel from '../PhotoCarousel'
import { useGallery } from '@/hooks/useGallery'

// ── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // Reset useGallery to default state (slide 0)
  vi.mocked(useGallery).mockImplementation(() => ({
    currentSlide: 0,
    next: vi.fn(),
    prev: vi.fn(),
    goTo: vi.fn(),
    onTouchStart: vi.fn(),
    onTouchEnd: vi.fn(),
    trackRef: { current: null },
  }))
})

describe('PhotoCarousel — zero photos', () => {
  it('renders the empty-state icon when photoRefs is empty', () => {
    render(<PhotoCarousel photoRefs={[]} />)
    // The empty state renders an SVG path — no carousel track
    expect(document.querySelector('svg')).not.toBeNull()
  })

  it('does not render any img elements when there are no photos', () => {
    render(<PhotoCarousel photoRefs={[]} />)
    expect(document.querySelectorAll('img')).toHaveLength(0)
  })

  it('does not call useGallery with a count greater than 0 when empty', () => {
    render(<PhotoCarousel photoRefs={[]} />)
    expect(vi.mocked(useGallery)).toHaveBeenCalledWith(0)
  })
})

describe('PhotoCarousel — single photo', () => {
  it('renders the AnimatedImage (eager) for the first photo', () => {
    render(<PhotoCarousel photoRefs={['photo-key-1']} />)
    const img = screen.getByTestId('animated-image')
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toContain('photo-key-1')
    expect(img.getAttribute('loading')).toBe('eager')
  })

  it('does not render arrow buttons when there is only one photo', () => {
    render(<PhotoCarousel photoRefs={['photo-key-1']} />)
    expect(screen.queryByLabelText('Previous photo')).toBeNull()
    expect(screen.queryByLabelText('Next photo')).toBeNull()
  })

  it('does not render dot indicators when there is only one photo', () => {
    render(<PhotoCarousel photoRefs={['photo-key-1']} />)
    expect(screen.queryByLabelText('Photo 1')).toBeNull()
  })

  it('builds the image src from the card() utility', () => {
    render(<PhotoCarousel photoRefs={['ref-abc']} />)
    expect(screen.getByTestId('animated-image').getAttribute('src')).toBe(
      'https://images.test/ref-abc-card'
    )
  })

  it('uses a custom alt text when provided', () => {
    render(<PhotoCarousel photoRefs={['ref-xyz']} alt="Casa en Piura" />)
    expect(screen.getByTestId('animated-image').getAttribute('alt')).toContain('Casa en Piura')
  })
})

describe('PhotoCarousel — multiple photos', () => {
  const THREE_PHOTOS = ['photo-1', 'photo-2', 'photo-3']

  it('renders prev and next arrow buttons', () => {
    render(<PhotoCarousel photoRefs={THREE_PHOTOS} />)
    expect(screen.getByLabelText('Previous photo')).not.toBeNull()
    expect(screen.getByLabelText('Next photo')).not.toBeNull()
  })

  it('renders one dot per photo', () => {
    render(<PhotoCarousel photoRefs={THREE_PHOTOS} />)
    expect(screen.getByLabelText('Photo 1')).not.toBeNull()
    expect(screen.getByLabelText('Photo 2')).not.toBeNull()
    expect(screen.getByLabelText('Photo 3')).not.toBeNull()
  })

  it('renders the first photo with AnimatedImage and eager loading', () => {
    render(<PhotoCarousel photoRefs={THREE_PHOTOS} />)
    const animatedImg = screen.getByTestId('animated-image')
    expect(animatedImg.getAttribute('loading')).toBe('eager')
    expect(animatedImg.getAttribute('src')).toContain('photo-1')
  })

  it('renders subsequent photos with <img> and lazy loading', () => {
    render(<PhotoCarousel photoRefs={THREE_PHOTOS} />)
    const allImgs = document.querySelectorAll('img[loading="lazy"]')
    expect(allImgs.length).toBeGreaterThanOrEqual(1)
  })

  it('calls prev() when the previous arrow is clicked', () => {
    const prevFn = vi.fn()
    vi.mocked(useGallery).mockReturnValue({
      currentSlide: 1, next: vi.fn(), prev: prevFn, goTo: vi.fn(),
      onTouchStart: vi.fn(), onTouchEnd: vi.fn(), trackRef: { current: null },
    })

    render(<PhotoCarousel photoRefs={THREE_PHOTOS} />)
    fireEvent.click(screen.getByLabelText('Previous photo'))
    expect(prevFn).toHaveBeenCalled()
  })

  it('calls next() when the next arrow is clicked', () => {
    const nextFn = vi.fn()
    vi.mocked(useGallery).mockReturnValue({
      currentSlide: 0, next: nextFn, prev: vi.fn(), goTo: vi.fn(),
      onTouchStart: vi.fn(), onTouchEnd: vi.fn(), trackRef: { current: null },
    })

    render(<PhotoCarousel photoRefs={THREE_PHOTOS} />)
    fireEvent.click(screen.getByLabelText('Next photo'))
    expect(nextFn).toHaveBeenCalled()
  })

  it('calls goTo(i) when a dot is clicked', () => {
    const goToFn = vi.fn()
    vi.mocked(useGallery).mockReturnValue({
      currentSlide: 0, next: vi.fn(), prev: vi.fn(), goTo: goToFn,
      onTouchStart: vi.fn(), onTouchEnd: vi.fn(), trackRef: { current: null },
    })

    render(<PhotoCarousel photoRefs={THREE_PHOTOS} />)
    fireEvent.click(screen.getByLabelText('Photo 2'))
    expect(goToFn).toHaveBeenCalledWith(1)
  })
})

describe('PhotoCarousel — maxPhotos prop', () => {
  it('limits rendered photos to maxPhotos', () => {
    const FIVE_PHOTOS = ['p1', 'p2', 'p3', 'p4', 'p5']
    render(<PhotoCarousel photoRefs={FIVE_PHOTOS} maxPhotos={2} />)
    // Only 2 photos should be rendered (1 AnimatedImage + 1 lazy img)
    expect(vi.mocked(useGallery)).toHaveBeenCalledWith(2)
  })
})

describe('PhotoCarousel — blurHash and microThumb', () => {
  it('calls blurHashToDataUrl with the hash for the placeholder background', () => {
    render(<PhotoCarousel photoRefs={['ref-1']} blurHash="LKO2?U%2" />)
    expect(mockBlurHashToDataUrl).toHaveBeenCalledWith('LKO2?U%2')
  })

  it('prefers microThumb over blurHash when both are provided', () => {
    render(<PhotoCarousel photoRefs={['ref-1']} blurHash="LKO2?U%2" microThumb="abc123" />)
    // The first slide div (`.shrink-0`) carries the background-image inline style
    // when a placeholder is present. React writes it via the element's style property,
    // which jsdom reflects as the camelCase backgroundImage accessor.
    const firstSlide = document.querySelector('.shrink-0') as HTMLElement | null
    expect(firstSlide).not.toBeNull()
    expect(firstSlide!.style.backgroundImage).toContain('data:image/webp;base64,abc123')
  })
})

describe('PhotoCarousel — onPhotoClick prop', () => {
  it('calls onPhotoClick when the container is clicked', () => {
    const onClick = vi.fn()
    render(<PhotoCarousel photoRefs={['ref-1', 'ref-2']} onPhotoClick={onClick} />)
    // Click on the carousel container (not a button)
    const container = document.querySelector('.group') as HTMLElement
    fireEvent.click(container)
    expect(onClick).toHaveBeenCalled()
  })
})
