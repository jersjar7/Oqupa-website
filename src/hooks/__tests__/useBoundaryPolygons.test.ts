// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ── Mock @vis.gl/react-google-maps ─────────────────────────────────────────
//
// The hook calls useMap() and useMapsLibrary('geometry'). We control what
// they return so we can test each branch (map/geometryLib null → early return,
// both present → fetch + render polygons).

let mockMap: Record<string, unknown> | null = null
let mockGeometryLib: Record<string, unknown> | null = null

vi.mock('@vis.gl/react-google-maps', () => ({
  useMap: () => mockMap,
  useMapsLibrary: () => mockGeometryLib,
}))

// ── Mock @/lib/constants ────────────────────────────────────────────────────
//
// The module-level geojsonCache in useBoundaryPolygons uses the URL as key.
// By giving each test group a unique URL we avoid cross-test cache pollution
// (once a URL is cached the hook skips fetch entirely on the next mount).

let mockBoundaryLayers: Array<{
  url: string
  fillColor: string
  fillOpacity: number
  strokeColor: string
  strokeWeight: number
  zIndex: number
  label: string
}> = []

vi.mock('@/lib/constants', async (importOriginal) => {
  const orig = await importOriginal<typeof import('@/lib/constants')>()
  return {
    ...orig,
    get BOUNDARY_LAYERS() {
      return mockBoundaryLayers
    },
  }
})

// ── Mock google.maps ────────────────────────────────────────────────────────
//
// We stub google.maps.Polygon, google.maps.LatLng, and
// google.maps.geometry.poly.containsLocation globally so the hook does not
// require the real Maps JS SDK.

let mockSetMap: ReturnType<typeof vi.fn>
let mockPolygonInstances: Array<{ paths: unknown; setMap: ReturnType<typeof vi.fn> }>
let mockContainsLocation: ReturnType<typeof vi.fn>

// Unique URL counter — ensures each test has its own cache entry
let urlCounter = 0
function uniqueUrl() {
  return `/boundaries/test-boundary-${urlCounter++}.geojson`
}

function defaultLayer(url: string) {
  return {
    url,
    label: 'Test',
    fillColor: '#F47843',
    fillOpacity: 0.05,
    strokeColor: '#F47843',
    strokeWeight: 3,
    zIndex: 2,
  }
}

beforeEach(() => {
  mockSetMap = vi.fn()
  mockPolygonInstances = []
  mockContainsLocation = vi.fn().mockReturnValue(false)

  vi.stubGlobal('google', {
    maps: {
      LatLng: vi.fn(function (lat: number, lng: number) {
        return { lat, lng }
      }),
      Polygon: vi.fn(function (opts: unknown) {
        const instance = { paths: (opts as { paths: unknown }).paths, setMap: mockSetMap }
        mockPolygonInstances.push(instance)
        return instance
      }),
      geometry: {
        poly: {
          containsLocation: mockContainsLocation,
        },
      },
    },
  })

  mockMap = null
  mockGeometryLib = null
  mockBoundaryLayers = []
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// ── GeoJSON helpers ─────────────────────────────────────────────────────────

function makePolygonGeoJSON(rings: number[][][]) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: rings,
        },
        properties: {},
      },
    ],
  }
}

function makeMultiPolygonGeoJSON(rings: number[][][][]) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'MultiPolygon',
          coordinates: rings,
        },
        properties: {},
      },
    ],
  }
}

const SIMPLE_RING = [
  [-80.6, -5.1],
  [-80.7, -5.1],
  [-80.7, -5.2],
  [-80.6, -5.2],
  [-80.6, -5.1],
]

// ── Tests ───────────────────────────────────────────────────────────────────

import { useBoundaryPolygons } from '@/hooks/useBoundaryPolygons'

describe('useBoundaryPolygons', () => {
  describe('return shape', () => {
    it('returns isLoaded and isInsideBoundary', () => {
      const { result } = renderHook(() => useBoundaryPolygons())
      expect(result.current).toHaveProperty('isLoaded')
      expect(result.current).toHaveProperty('isInsideBoundary')
      expect(typeof result.current.isInsideBoundary).toBe('function')
    })

    it('isLoaded starts as false', () => {
      const { result } = renderHook(() => useBoundaryPolygons())
      expect(result.current.isLoaded).toBe(false)
    })
  })

  describe('early return when dependencies are not ready', () => {
    it('does not fetch when map is null', async () => {
      mockMap = null
      mockGeometryLib = { poly: {} }
      mockBoundaryLayers = [defaultLayer(uniqueUrl())]
      const fetchSpy = vi.spyOn(globalThis, 'fetch')

      renderHook(() => useBoundaryPolygons())

      await act(async () => {})
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('does not fetch when geometryLib is null', async () => {
      mockMap = {}
      mockGeometryLib = null
      mockBoundaryLayers = [defaultLayer(uniqueUrl())]
      const fetchSpy = vi.spyOn(globalThis, 'fetch')

      renderHook(() => useBoundaryPolygons())

      await act(async () => {})
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('does not fetch when both map and geometryLib are null', async () => {
      mockMap = null
      mockGeometryLib = null
      mockBoundaryLayers = [defaultLayer(uniqueUrl())]
      const fetchSpy = vi.spyOn(globalThis, 'fetch')

      renderHook(() => useBoundaryPolygons())

      await act(async () => {})
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    it('isLoaded remains false when dependencies are null', async () => {
      mockMap = null
      mockGeometryLib = null

      const { result } = renderHook(() => useBoundaryPolygons())
      await act(async () => {})
      expect(result.current.isLoaded).toBe(false)
    })
  })

  describe('isInsideBoundary permissive default', () => {
    it('returns true when geometryLib is null (boundaries loading)', () => {
      mockMap = null
      mockGeometryLib = null
      const { result } = renderHook(() => useBoundaryPolygons())

      // No polygons loaded yet — permissive default allows placement
      expect(result.current.isInsideBoundary(-5.19, -80.63)).toBe(true)
    })

    it('returns true when geometryLib is set but no polygons are loaded yet', () => {
      const url = uniqueUrl()
      mockMap = {}
      mockGeometryLib = { poly: { containsLocation: mockContainsLocation } }
      mockBoundaryLayers = [defaultLayer(url)]
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {})) // never resolves

      const { result } = renderHook(() => useBoundaryPolygons())

      // polygonsRef.current.length === 0 → returns true
      expect(result.current.isInsideBoundary(-5.19, -80.63)).toBe(true)
    })
  })

  describe('polygon loading from GeoJSON', () => {
    it('fetches the boundary GeoJSON URL', async () => {
      const url = uniqueUrl()
      mockMap = {}
      mockGeometryLib = { poly: { containsLocation: mockContainsLocation } }
      mockBoundaryLayers = [defaultLayer(url)]

      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        json: async () => makePolygonGeoJSON([SIMPLE_RING]),
      } as Response)

      renderHook(() => useBoundaryPolygons())

      await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())

      const [calledUrl] = fetchMock.mock.calls[0]!
      expect(calledUrl).toBe(url)
    })

    it('sets isLoaded to true after polygons are rendered', async () => {
      const url = uniqueUrl()
      mockMap = {}
      mockGeometryLib = { poly: { containsLocation: mockContainsLocation } }
      mockBoundaryLayers = [defaultLayer(url)]

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        json: async () => makePolygonGeoJSON([SIMPLE_RING]),
      } as Response)

      const { result } = renderHook(() => useBoundaryPolygons())

      await waitFor(() => expect(result.current.isLoaded).toBe(true))
    })

    it('creates one Polygon per ring in a Polygon feature', async () => {
      const url = uniqueUrl()
      mockMap = {}
      mockGeometryLib = { poly: { containsLocation: mockContainsLocation } }
      mockBoundaryLayers = [defaultLayer(url)]

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        json: async () => makePolygonGeoJSON([SIMPLE_RING]),
      } as Response)

      renderHook(() => useBoundaryPolygons())

      await waitFor(() => expect(mockPolygonInstances).toHaveLength(1))
    })

    it('creates one Polygon per sub-ring in a MultiPolygon feature', async () => {
      const url = uniqueUrl()
      mockMap = {}
      mockGeometryLib = { poly: { containsLocation: mockContainsLocation } }
      mockBoundaryLayers = [defaultLayer(url)]

      // Two sub-polygons in the MultiPolygon
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        json: async () => makeMultiPolygonGeoJSON([[SIMPLE_RING], [SIMPLE_RING]]),
      } as Response)

      renderHook(() => useBoundaryPolygons())

      await waitFor(() => expect(mockPolygonInstances).toHaveLength(2))
    })

    it('maps GeoJSON coordinates [lng, lat] to LatLng(lat, lng)', async () => {
      const url = uniqueUrl()
      mockMap = {}
      mockGeometryLib = { poly: { containsLocation: mockContainsLocation } }
      mockBoundaryLayers = [defaultLayer(url)]

      const ring = [[-80.6, -5.1], [-80.7, -5.2], [-80.6, -5.1]]
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        json: async () => makePolygonGeoJSON([ring]),
      } as Response)

      renderHook(() => useBoundaryPolygons())

      await waitFor(() => expect(mockPolygonInstances).toHaveLength(1))

      const LatLng = vi.mocked(google.maps.LatLng)
      // First coord: lng=-80.6, lat=-5.1 → LatLng(-5.1, -80.6)
      expect(LatLng).toHaveBeenCalledWith(-5.1, -80.6)
    })

    it('creates polygons for multiple boundary layers', async () => {
      const url1 = uniqueUrl()
      const url2 = uniqueUrl()
      mockMap = {}
      mockGeometryLib = { poly: { containsLocation: mockContainsLocation } }
      mockBoundaryLayers = [defaultLayer(url1), defaultLayer(url2)]

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        json: async () => makePolygonGeoJSON([SIMPLE_RING]),
      } as Response)

      renderHook(() => useBoundaryPolygons())

      // Two layers × one polygon each = 2 total
      await waitFor(() => expect(mockPolygonInstances).toHaveLength(2))
    })
  })

  describe('isInsideBoundary after polygons are loaded', () => {
    async function setup() {
      const url = uniqueUrl()
      mockMap = {}
      mockGeometryLib = { poly: { containsLocation: mockContainsLocation } }
      mockBoundaryLayers = [defaultLayer(url)]

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        json: async () => makePolygonGeoJSON([SIMPLE_RING]),
      } as Response)

      const { result } = renderHook(() => useBoundaryPolygons())
      await waitFor(() => expect(result.current.isLoaded).toBe(true))
      return result
    }

    it('returns false when containsLocation returns false for all polygons', async () => {
      mockContainsLocation.mockReturnValue(false)
      const result = await setup()

      expect(result.current.isInsideBoundary(-5.19, -80.63)).toBe(false)
    })

    it('returns true when containsLocation returns true for at least one polygon', async () => {
      mockContainsLocation.mockReturnValue(true)
      const result = await setup()

      expect(result.current.isInsideBoundary(-5.19, -80.63)).toBe(true)
    })

    it('calls containsLocation with a LatLng built from (lat, lng)', async () => {
      mockContainsLocation.mockReturnValue(true)
      const result = await setup()

      result.current.isInsideBoundary(-5.19, -80.63)

      expect(mockContainsLocation).toHaveBeenCalled()
      // The LatLng mock records its calls; confirm the last call used the right coords
      const LatLng = vi.mocked(google.maps.LatLng)
      const lastCall = LatLng.mock.calls[LatLng.mock.calls.length - 1]
      expect(lastCall).toEqual([-5.19, -80.63])
    })
  })

  describe('cleanup on unmount', () => {
    it('calls setMap(null) on each polygon when unmounted', async () => {
      const url = uniqueUrl()
      mockMap = {}
      mockGeometryLib = { poly: { containsLocation: mockContainsLocation } }
      mockBoundaryLayers = [defaultLayer(url)]

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        json: async () => makePolygonGeoJSON([SIMPLE_RING]),
      } as Response)

      const { unmount } = renderHook(() => useBoundaryPolygons())

      await waitFor(() => expect(mockPolygonInstances).toHaveLength(1))

      unmount()

      expect(mockSetMap).toHaveBeenCalledWith(null)
    })

    it('does not throw when unmounted before fetch resolves', async () => {
      const url = uniqueUrl()
      mockMap = {}
      mockGeometryLib = { poly: { containsLocation: mockContainsLocation } }
      mockBoundaryLayers = [defaultLayer(url)]

      // Fetch never resolves — hook is unmounted first
      vi.spyOn(globalThis, 'fetch').mockImplementation(() => new Promise(() => {}))

      const { unmount } = renderHook(() => useBoundaryPolygons())

      await act(async () => {})

      expect(() => unmount()).not.toThrow()
    })

    it('does not call setMap(null) when no polygons were created', () => {
      // map is null → early return → no polygons
      mockMap = null
      mockGeometryLib = null

      const { unmount } = renderHook(() => useBoundaryPolygons())
      unmount()

      expect(mockSetMap).not.toHaveBeenCalled()
    })
  })

  describe('cancellation on unmount mid-fetch', () => {
    it('does not set isLoaded when unmounted while awaiting fetch (line 74 cancelled branch)', async () => {
      const url = uniqueUrl()
      mockMap = {}
      mockGeometryLib = { poly: { containsLocation: mockContainsLocation } }
      mockBoundaryLayers = [defaultLayer(url)]

      // Control when fetch resolves using a deferred promise
      let resolveFetch!: (value: Response) => void
      vi.spyOn(globalThis, 'fetch').mockReturnValue(
        new Promise<Response>((res) => { resolveFetch = res }),
      )

      const { result, unmount } = renderHook(() => useBoundaryPolygons())

      // Give the effect time to start the fetch
      await act(async () => {})

      // Unmount BEFORE fetch resolves — sets cancelled=true
      unmount()

      // Now resolve the fetch — the cancelled guard should prevent setIsLoaded(true)
      await act(async () => {
        resolveFetch({
          json: async () => makePolygonGeoJSON([SIMPLE_RING]),
        } as Response)
        await Promise.resolve()
      })

      // isLoaded must remain false since the update was cancelled
      expect(result.current.isLoaded).toBe(false)
      // No polygons should have been set on the map
      expect(mockPolygonInstances.length).toBe(0)
    })

    it('does not render polygons when unmounted during multi-layer load (line 42 cancelled branch)', async () => {
      const url1 = uniqueUrl()
      const url2 = uniqueUrl()
      mockMap = {}
      mockGeometryLib = { poly: { containsLocation: mockContainsLocation } }
      mockBoundaryLayers = [defaultLayer(url1), defaultLayer(url2)]

      // Layer 1 resolves immediately; layer 2 is held
      let resolveLayer2!: (value: Response) => void

      vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
        if (url === url1) {
          return Promise.resolve({
            json: async () => makePolygonGeoJSON([SIMPLE_RING]),
          } as Response)
        }
        // layer 2 is pending
        return new Promise<Response>((res) => { resolveLayer2 = res })
      })

      const { unmount } = renderHook(() => useBoundaryPolygons())

      // Wait for layer 1 to be fetched (fetch called twice)
      await waitFor(() => {
        expect(vi.mocked(globalThis.fetch).mock.calls.length).toBeGreaterThanOrEqual(1)
      })

      // Unmount while layer 2 fetch is still pending — sets cancelled=true
      unmount()

      // Resolve layer 2 — the cancelled guard on line 42 should stop further processing
      await act(async () => {
        resolveLayer2({
          json: async () => makePolygonGeoJSON([SIMPLE_RING]),
        } as Response)
        await Promise.resolve()
      })

      // Polygons for layer 2 should not have been created (processing was cancelled)
      // The exact count depends on whether layer 1 rendered before unmount, but
      // layer 2 processing is definitely skipped.
      expect(mockPolygonInstances.length).toBeLessThanOrEqual(1)
    })
  })

  describe('GeoJSON caching', () => {
    it('only fetches once when the same URL is requested on a second render', async () => {
      // Use the SAME URL for both mounts to trigger cache hit on the second mount
      const url = uniqueUrl()
      mockMap = {}
      mockGeometryLib = { poly: { containsLocation: mockContainsLocation } }
      mockBoundaryLayers = [defaultLayer(url)]

      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        json: async () => makePolygonGeoJSON([SIMPLE_RING]),
      } as Response)

      // First mount — populates the cache
      const { unmount: unmount1 } = renderHook(() => useBoundaryPolygons())
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
      unmount1()

      const callsBefore = fetchMock.mock.calls.length

      // Second mount — same URL, should hit the cache, not fetch again
      const { unmount: unmount2 } = renderHook(() => useBoundaryPolygons())
      await waitFor(() => expect(mockPolygonInstances.length).toBeGreaterThanOrEqual(2))
      unmount2()

      // Fetch count should not have increased
      expect(fetchMock.mock.calls.length).toBe(callsBefore)
    })
  })
})
