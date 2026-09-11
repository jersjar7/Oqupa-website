import { describe, it, expect } from 'vitest'
import { getLayout, STORY_LAYOUT, SQUARE_LAYOUT } from '../cardLayout'

describe('getLayout', () => {
  it('returns STORY_LAYOUT for the "story" format', () => {
    const layout = getLayout('story')
    expect(layout).toBe(STORY_LAYOUT)
  })

  it('returns SQUARE_LAYOUT for the "square" format', () => {
    const layout = getLayout('square')
    expect(layout).toBe(SQUARE_LAYOUT)
  })

  it('story layout has 9:16 aspect ratio (1080 x 1920)', () => {
    expect(STORY_LAYOUT.width).toBe(1080)
    expect(STORY_LAYOUT.height).toBe(1920)
  })

  it('square layout has 1:1 aspect ratio (1080 x 1080)', () => {
    expect(SQUARE_LAYOUT.width).toBe(1080)
    expect(SQUARE_LAYOUT.height).toBe(1080)
  })

  it('story layout supports up to 3 photos', () => {
    expect(STORY_LAYOUT.maxPhotos).toBe(3)
  })

  it('square layout supports only 1 photo', () => {
    expect(SQUARE_LAYOUT.maxPhotos).toBe(1)
  })

  it('both layouts expose all required CardLayout fields', () => {
    const requiredKeys: (keyof typeof STORY_LAYOUT)[] = [
      'width', 'height', 'maxPhotos',
      'logoBottom', 'logoRight', 'logoHeight', 'logoSubtitleFontSize', 'logoToSubtitleGap',
      'badgeTop', 'badgeLeft', 'badgePaddingH', 'badgePaddingV', 'badgeFontSize',
      'badgeLetterSpacing', 'badgeRadius',
      'linkPlaceholderTop', 'linkPlaceholderFontSize',
      'contentPaddingH', 'priceFontSize', 'specsFontSize', 'locationFontSize',
      'priceToSpecsGap', 'specsToLocationGap',
      'textBackgroundPaddingV', 'textBackgroundPaddingH',
    ]
    for (const key of requiredKeys) {
      expect(STORY_LAYOUT[key]).toBeDefined()
      expect(SQUARE_LAYOUT[key]).toBeDefined()
    }
  })
})
