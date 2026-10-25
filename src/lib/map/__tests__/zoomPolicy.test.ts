// Ported from the app's map_zoom_policy_test.dart: only two views ever.
import { describe, it, expect } from 'vitest'
import { DISTRICT_CARDS_BELOW_ZOOM, MAX_FIT_ZOOM, showsDistrictCards, zoomToFit } from '../zoomPolicy'

describe('zoom policy', () => {
  it('below the threshold: district cards', () => {
    expect(showsDistrictCards(DISTRICT_CARDS_BELOW_ZOOM - 0.01)).toBe(true)
    expect(showsDistrictCards(8)).toBe(true)
  })
  it('at or above the threshold: pins and word groups', () => {
    expect(showsDistrictCards(DISTRICT_CARDS_BELOW_ZOOM)).toBe(false)
    expect(showsDistrictCards(16)).toBe(false)
  })
  it('the threshold is the same as the app (12)', () => {
    expect(DISTRICT_CARDS_BELOW_ZOOM).toBe(12)
  })

  describe('zoomToFit (tapping a district card)', () => {
    it('a wide district still lands at the card threshold', () => {
      const z = zoomToFit({ south: -5.6, west: -81.0, north: -4.8, east: -80.2 }, 390, 700)
      expect(z).toBe(DISTRICT_CARDS_BELOW_ZOOM)
    })
    it('a district of one listing does not zoom to street level', () => {
      const z = zoomToFit({ south: -5.1945, west: -80.6328, north: -5.1945, east: -80.6328 }, 390, 700)
      expect(z).toBe(MAX_FIT_ZOOM)
    })
    it('a ~3 km spread frames between the two', () => {
      const z = zoomToFit({ south: -5.21, west: -80.65, north: -5.18, east: -80.62 }, 390, 700)
      expect(z).toBeGreaterThan(DISTRICT_CARDS_BELOW_ZOOM)
      expect(z).toBeLessThan(MAX_FIT_ZOOM)
    })
  })
})
