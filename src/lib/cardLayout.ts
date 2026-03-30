// Hardcoded layout constants for branded card image generation.
//
// Each CardFormat has its own fixed layout — no responsive logic,
// no viewport dependency. Think Figma artboard, not browser window.
//
// All values are in absolute pixels matching the Flutter BrandedCardPainter.

export type CardFormat = 'story' | 'square'

export interface CardLayout {
  width: number
  height: number

  // Photo strips
  maxPhotos: number

  // Logo + subtitle (bottom-right overlay)
  logoBottom: number
  logoRight: number
  logoHeight: number
  logoSubtitleFontSize: number
  logoToSubtitleGap: number

  // Badge (operation label: "SE VENDE" / "SE ALQUILA" — top-left)
  badgeTop: number
  badgeLeft: number
  badgePaddingH: number
  badgePaddingV: number
  badgeFontSize: number
  badgeLetterSpacing: number
  badgeRadius: number

  // Link placeholder ("Enlace aquí" — below badge, story only)
  linkPlaceholderTop: number
  linkPlaceholderFontSize: number

  // Text overlay (price, specs, location — bottom-left with dark background)
  contentPaddingH: number
  priceFontSize: number
  specsFontSize: number
  locationFontSize: number
  priceToSpecsGap: number
  specsToLocationGap: number
  textBackgroundPaddingV: number
  textBackgroundPaddingH: number
}

/** 9:16 story format (1080 x 1920) — IG/FB/WA Stories, Reels, TikTok. */
export const STORY_LAYOUT: CardLayout = {
  width: 1080,
  height: 1920,
  maxPhotos: 3,
  logoBottom: 48,
  logoRight: 48,
  logoHeight: 110,
  logoSubtitleFontSize: 24,
  logoToSubtitleGap: 6,
  badgeTop: 220,
  badgeLeft: 48,
  badgePaddingH: 28,
  badgePaddingV: 14,
  badgeFontSize: 42,
  badgeLetterSpacing: 3,
  badgeRadius: 8,
  linkPlaceholderTop: 306,
  linkPlaceholderFontSize: 36,
  contentPaddingH: 48,
  priceFontSize: 64,
  specsFontSize: 36,
  locationFontSize: 34,
  priceToSpecsGap: 12,
  specsToLocationGap: 8,
  textBackgroundPaddingV: 32,
  textBackgroundPaddingH: 48,
}

/** 1:1 square format (1080 x 1080) — Instagram feed, Facebook. */
export const SQUARE_LAYOUT: CardLayout = {
  width: 1080,
  height: 1080,
  maxPhotos: 1,
  logoBottom: 40,
  logoRight: 40,
  logoHeight: 88,
  logoSubtitleFontSize: 20,
  logoToSubtitleGap: 4,
  badgeTop: 48,
  badgeLeft: 40,
  badgePaddingH: 24,
  badgePaddingV: 12,
  badgeFontSize: 36,
  badgeLetterSpacing: 2.5,
  badgeRadius: 8,
  linkPlaceholderTop: 108,
  linkPlaceholderFontSize: 24,
  contentPaddingH: 40,
  priceFontSize: 52,
  specsFontSize: 30,
  locationFontSize: 28,
  priceToSpecsGap: 10,
  specsToLocationGap: 6,
  textBackgroundPaddingV: 28,
  textBackgroundPaddingH: 40,
}

export function getLayout(format: CardFormat): CardLayout {
  return format === 'story' ? STORY_LAYOUT : SQUARE_LAYOUT
}
