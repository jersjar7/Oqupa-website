// Ported from the app's map_zoom_policy_test.dart (ADR-031 item 16): zoomed
// far out every listing is a small dot with its type drawing; from the
// threshold in, style-A pins and "N aquí" groups. A dot only ever turns into
// its own pin — one change of shape. (Replaces the district-card policy of map
// plan step 2, which Jerson dropped: "The districts are already displayed on
// the base map itself.")
import { describe, it, expect } from 'vitest'
import { DOTS_BELOW_ZOOM, showsDots } from '../zoomPolicy'

describe('zoom policy', () => {
  it('below the threshold: dots', () => {
    expect(showsDots(DOTS_BELOW_ZOOM - 0.01)).toBe(true)
    expect(showsDots(8)).toBe(true)
  })
  it('at or above the threshold: pins and word groups', () => {
    expect(showsDots(DOTS_BELOW_ZOOM)).toBe(false)
    expect(showsDots(16)).toBe(false)
  })
  // ADR-033 (Jerson, 2026-10-25): was 12. Tapping a dot no longer zooms.
  it('the threshold is the same as the app (14)', () => {
    expect(DOTS_BELOW_ZOOM).toBe(14)
  })
})
