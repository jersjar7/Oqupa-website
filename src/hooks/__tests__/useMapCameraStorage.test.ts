// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMapCameraStorage } from '@/hooks/useMapCameraStorage'

const STORAGE_KEY = 'oqupa-map-camera'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStorage(store: Record<string, string> = {}) {
  return {
    _store: store,
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useMapCameraStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ---- return shape --------------------------------------------------------

  describe('return shape', () => {
    it('returns savedCamera and saveCamera', () => {
      const ls = makeStorage()
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      expect(result.current).toHaveProperty('savedCamera')
      expect(result.current).toHaveProperty('saveCamera')
      expect(typeof result.current.saveCamera).toBe('function')
    })
  })

  // ---- loading from localStorage on mount ---------------------------------

  describe('loadCamera (initial state)', () => {
    it('returns null savedCamera when localStorage is empty', () => {
      const ls = makeStorage()
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      expect(result.current.savedCamera).toBeNull()
    })

    it('reads from the correct storage key', () => {
      const ls = makeStorage()
      vi.stubGlobal('localStorage', ls)

      renderHook(() => useMapCameraStorage())

      expect(ls.getItem).toHaveBeenCalledWith(STORAGE_KEY)
    })

    it('returns a valid SavedCamera when all three fields are numbers', () => {
      const camera = { lat: -12.046374, lng: -77.042793, zoom: 13 }
      const ls = makeStorage({ [STORAGE_KEY]: JSON.stringify(camera) })
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      expect(result.current.savedCamera).toEqual(camera)
    })

    it('returns lat, lng, zoom with correct numeric values', () => {
      const ls = makeStorage({ [STORAGE_KEY]: JSON.stringify({ lat: 1.5, lng: 2.5, zoom: 10 }) })
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      expect(result.current.savedCamera?.lat).toBe(1.5)
      expect(result.current.savedCamera?.lng).toBe(2.5)
      expect(result.current.savedCamera?.zoom).toBe(10)
    })

    it('returns null when localStorage contains invalid JSON', () => {
      const ls = makeStorage({ [STORAGE_KEY]: 'not-valid-json' })
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      expect(result.current.savedCamera).toBeNull()
    })

    it('returns null when stored object is missing lat', () => {
      const ls = makeStorage({ [STORAGE_KEY]: JSON.stringify({ lng: -77, zoom: 12 }) })
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      expect(result.current.savedCamera).toBeNull()
    })

    it('returns null when stored object is missing lng', () => {
      const ls = makeStorage({ [STORAGE_KEY]: JSON.stringify({ lat: -12, zoom: 12 }) })
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      expect(result.current.savedCamera).toBeNull()
    })

    it('returns null when stored object is missing zoom', () => {
      const ls = makeStorage({ [STORAGE_KEY]: JSON.stringify({ lat: -12, lng: -77 }) })
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      expect(result.current.savedCamera).toBeNull()
    })

    it('returns null when lat is a string instead of a number', () => {
      const ls = makeStorage({ [STORAGE_KEY]: JSON.stringify({ lat: '-12', lng: -77, zoom: 12 }) })
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      expect(result.current.savedCamera).toBeNull()
    })

    it('returns null when lng is a string instead of a number', () => {
      const ls = makeStorage({ [STORAGE_KEY]: JSON.stringify({ lat: -12, lng: '-77', zoom: 12 }) })
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      expect(result.current.savedCamera).toBeNull()
    })

    it('returns null when zoom is a string instead of a number', () => {
      const ls = makeStorage({ [STORAGE_KEY]: JSON.stringify({ lat: -12, lng: -77, zoom: '12' }) })
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      expect(result.current.savedCamera).toBeNull()
    })

    it('returns null when stored value is null JSON', () => {
      const ls = makeStorage({ [STORAGE_KEY]: 'null' })
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      expect(result.current.savedCamera).toBeNull()
    })

    it('returns null when stored value is an array', () => {
      const ls = makeStorage({ [STORAGE_KEY]: JSON.stringify([-12, -77, 12]) })
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      expect(result.current.savedCamera).toBeNull()
    })

    it('returns null when localStorage.getItem throws', () => {
      const ls = {
        getItem: vi.fn(() => { throw new Error('SecurityError') }),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      }
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      expect(result.current.savedCamera).toBeNull()
    })
  })

  // ---- saveCamera ----------------------------------------------------------

  describe('saveCamera', () => {
    it('writes to the correct storage key', () => {
      const ls = makeStorage()
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      act(() => {
        result.current.saveCamera(-12.046374, -77.042793, 13)
      })

      expect(ls.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String))
    })

    it('serialises lat, lng, zoom as JSON', () => {
      const ls = makeStorage()
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      act(() => {
        result.current.saveCamera(-12.046374, -77.042793, 13)
      })

      const written = JSON.parse(ls.setItem.mock.calls[0][1])
      expect(written).toEqual({ lat: -12.046374, lng: -77.042793, zoom: 13 })
    })

    it('saves zero coordinates without confusion', () => {
      const ls = makeStorage()
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      act(() => {
        result.current.saveCamera(0, 0, 1)
      })

      const written = JSON.parse(ls.setItem.mock.calls[0][1])
      expect(written).toEqual({ lat: 0, lng: 0, zoom: 1 })
    })

    it('saves negative coordinates correctly', () => {
      const ls = makeStorage()
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      act(() => {
        result.current.saveCamera(-90, -180, 2)
      })

      const written = JSON.parse(ls.setItem.mock.calls[0][1])
      expect(written).toEqual({ lat: -90, lng: -180, zoom: 2 })
    })

    it('can be called multiple times, each call writes the latest values', () => {
      const ls = makeStorage()
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      act(() => {
        result.current.saveCamera(1, 2, 3)
        result.current.saveCamera(4, 5, 6)
      })

      expect(ls.setItem).toHaveBeenCalledTimes(2)
      const lastCall = ls.setItem.mock.calls[1]
      expect(JSON.parse(lastCall[1])).toEqual({ lat: 4, lng: 5, zoom: 6 })
    })

    it('does not throw when localStorage.setItem throws (quota error)', () => {
      const ls = {
        getItem: vi.fn(() => null),
        setItem: vi.fn(() => { throw new DOMException('QuotaExceededError') }),
        removeItem: vi.fn(),
      }
      vi.stubGlobal('localStorage', ls)

      const { result } = renderHook(() => useMapCameraStorage())

      expect(() => {
        act(() => {
          result.current.saveCamera(-12, -77, 12)
        })
      }).not.toThrow()
    })

    it('saveCamera is stable across re-renders (same reference)', () => {
      const ls = makeStorage()
      vi.stubGlobal('localStorage', ls)

      const { result, rerender } = renderHook(() => useMapCameraStorage())
      const firstRef = result.current.saveCamera

      rerender()

      expect(result.current.saveCamera).toBe(firstRef)
    })
  })

  // ---- round-trip ---------------------------------------------------------

  describe('round-trip (save then reload)', () => {
    it('savedCamera from a fresh hook reflects previously saved values', () => {
      const store: Record<string, string> = {}
      const ls = makeStorage(store)
      vi.stubGlobal('localStorage', ls)

      // First mount — save a camera position
      const { result: first, unmount } = renderHook(() => useMapCameraStorage())
      act(() => {
        first.current.saveCamera(-12.046374, -77.042793, 15)
      })
      unmount()

      // Second mount — should load the saved position
      const { result: second } = renderHook(() => useMapCameraStorage())
      expect(second.current.savedCamera).toEqual({ lat: -12.046374, lng: -77.042793, zoom: 15 })
    })
  })
})
