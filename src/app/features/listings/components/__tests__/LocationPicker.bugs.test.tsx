// @vitest-environment jsdom
// ADR-043 step 3 — the publish form's map (bugs 8 and 10).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'

const mb = vi.hoisted(() => {
  const handlers: Record<string, (e: unknown) => void> = {}
  const markers: { lngLat: [number, number]; dragend?: () => void; removed?: boolean }[] = []
  const mapOptions: Record<string, unknown>[] = []
  class FakeMarker {
    entry: { lngLat: [number, number]; dragend?: () => void; removed?: boolean } = { lngLat: [0, 0] }
    constructor() { markers.push(this.entry) }
    setLngLat(ll: [number, number]) { this.entry.lngLat = ll; return this }
    addTo() { return this }
    on(ev: string, cb: () => void) { if (ev === 'dragend') this.entry.dragend = cb; return this }
    getLngLat() { return { lng: this.entry.lngLat[0], lat: this.entry.lngLat[1] } }
    remove() { this.entry.removed = true }
  }
  class FakeMap {
    constructor(opts: Record<string, unknown>) { mapOptions.push(opts) }
    on(ev: string, cb: (e: unknown) => void) { handlers[ev] = cb; if (ev === 'load') cb({}); return this }
    addControl() {}
    getSource() { return undefined }
    addSource() {}
    addLayer() {}
    remove() {}
  }
  return { handlers, markers, mapOptions, FakeMap, FakeMarker }
})
vi.mock('mapbox-gl', () => ({
  default: { Map: mb.FakeMap, Marker: mb.FakeMarker, NavigationControl: class {}, accessToken: '' },
}))
vi.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}))
vi.mock('@/lib/map/departamentoBorder', () => ({
  DepartamentoBorder: { load: () => Promise.resolve({ contains: (lat: number) => lat > -6.5 && lat < -3.5 }) },
}))

import { LocationPickerMap } from '../LocationPicker'

function pointer(kind: 'mouse' | 'touch') {
  window.matchMedia = ((q: string) => ({
    matches: kind === 'mouse', media: q, addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

describe('LocationPicker — a pin dragged outside Piura goes back', () => {
  beforeEach(() => {
    mb.markers.length = 0
    mb.mapOptions.length = 0
    pointer('mouse')
  })

  it('returns to its last valid place, with the message', async () => {
    const onChange = vi.fn()
    render(<LocationPickerMap token="pk.test" latitude={-5.19} longitude={-80.63} onChange={onChange} />)
    await waitFor(() => expect(mb.markers.length).toBeGreaterThan(0))
    const m = mb.markers[mb.markers.length - 1]!
    m.lngLat = [-77.04, -12.04] // Lima
    await act(async () => m.dragend!())
    await waitFor(() => expect(screen.getByText(/Fuera de zona permitida/)).toBeDefined())
    expect(onChange).not.toHaveBeenCalled()
    expect(m.lngLat).toEqual([-80.63, -5.19])
  })
})

describe('LocationPicker — a first pin outside Piura (review #7)', () => {
  beforeEach(() => {
    mb.markers.length = 0
    pointer('mouse')
  })

  it('with no earlier valid place, the refused pin is taken off the map', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<LocationPickerMap token="pk.test" latitude={-5.19} longitude={-80.63} onChange={onChange} />)
    await waitFor(() => expect(mb.markers.length).toBeGreaterThan(0))
    // The place is cleared (no valid pin any more)…
    rerender(<LocationPickerMap token="pk.test" latitude={null} longitude={null} onChange={onChange} />)
    const m = mb.markers[mb.markers.length - 1]!
    // …and the pin is then dropped outside Piura.
    m.lngLat = [-77.04, -12.04]
    await act(async () => m.dragend!())
    await waitFor(() => expect(screen.getByText(/Fuera de zona permitida/)).toBeDefined())
    expect(m.removed).toBe(true)
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('LocationPicker — scrolling the page on a phone', () => {
  beforeEach(() => {
    mb.mapOptions.length = 0
  })
  afterEach(() => pointer('mouse'))

  it('on a phone: one finger scrolls the page, two fingers move the map, said in Spanish', () => {
    pointer('touch')
    render(<LocationPickerMap token="pk.test" latitude={-5.19} longitude={-80.63} onChange={() => {}} />)
    const opts = mb.mapOptions[mb.mapOptions.length - 1]!
    expect(opts.cooperativeGestures).toBe(true)
    expect((opts.locale as Record<string, string>)['TouchPanBlocker.Message']).toBe('Usa dos dedos para mover el mapa')
    expect(screen.getByText('Usa dos dedos para mover el mapa.')).toBeDefined()
  })

  it('with a mouse the map behaves as before', () => {
    pointer('mouse')
    render(<LocationPickerMap token="pk.test" latitude={-5.19} longitude={-80.63} onChange={() => {}} />)
    const opts = mb.mapOptions[mb.mapOptions.length - 1]!
    expect(opts.cooperativeGestures).toBeFalsy()
    expect(screen.queryByText('Usa dos dedos para mover el mapa.')).toBeNull()
  })
})
