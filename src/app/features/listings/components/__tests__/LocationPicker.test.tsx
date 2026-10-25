// @vitest-environment jsdom
// The publish form's location picker on Mapbox (map plan step 4): tap or drag
// to place the pin; a pin outside the departamento de Piura is refused.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'

const mb = vi.hoisted(() => {
  const handlers: Record<string, (e: unknown) => void> = {}
  const markers: { lngLat: [number, number]; dragend?: () => void }[] = []
  class FakeMarker {
    entry: { lngLat: [number, number]; dragend?: () => void } = { lngLat: [0, 0] }
    constructor() { markers.push(this.entry) }
    setLngLat(ll: [number, number]) { this.entry.lngLat = ll; return this }
    addTo() { return this }
    on(ev: string, cb: () => void) { if (ev === 'dragend') this.entry.dragend = cb; return this }
    getLngLat() { return { lng: this.entry.lngLat[0], lat: this.entry.lngLat[1] } }
    remove() {}
  }
  class FakeMap {
    constructor() {}
    on(ev: string, cb: (e: unknown) => void) { handlers[ev] = cb; if (ev === 'load') cb({}) ; return this }
    addControl() {}
    getSource() { return undefined }
    addSource() {}
    addLayer() {}
    remove() {}
  }
  return { handlers, markers, FakeMap, FakeMarker }
})
vi.mock('mapbox-gl', () => ({
  default: { Map: mb.FakeMap, Marker: mb.FakeMarker, NavigationControl: class {}, accessToken: '' },
}))
vi.mock('mapbox-gl/dist/mapbox-gl.css', () => ({}))
vi.mock('@/lib/map/departamentoBorder', () => ({
  DepartamentoBorder: { load: () => Promise.resolve({ contains: (lat: number) => lat > -6.5 && lat < -3.5 }) },
}))

import { LocationPickerMap } from '../LocationPicker'

describe('LocationPicker (Mapbox)', () => {
  beforeEach(() => {
    mb.markers.length = 0
  })

  it('a tap inside the departamento places the pin', async () => {
    const onChange = vi.fn()
    render(<LocationPickerMap token="pk.test" latitude={null} longitude={null} onChange={onChange} />)
    await waitFor(() => expect(mb.handlers.click).toBeDefined())
    await act(async () => mb.handlers.click!({ lngLat: { lat: -5.19, lng: -80.63 } }))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(-5.19, -80.63))
  })

  it('a tap outside is refused with a message', async () => {
    const onChange = vi.fn()
    render(<LocationPickerMap token="pk.test" latitude={null} longitude={null} onChange={onChange} />)
    await waitFor(() => expect(mb.handlers.click).toBeDefined())
    await act(async () => mb.handlers.click!({ lngLat: { lat: -12.04, lng: -77.04 } }))
    await waitFor(() => expect(screen.getByText(/Fuera de zona permitida/)).toBeDefined())
    expect(onChange).not.toHaveBeenCalled()
  })

  it('an existing pin is shown and can be dragged', async () => {
    const onChange = vi.fn()
    render(<LocationPickerMap token="pk.test" latitude={-5.19} longitude={-80.63} onChange={onChange} />)
    await waitFor(() => expect(mb.markers.length).toBeGreaterThan(0))
    const m = mb.markers[mb.markers.length - 1]!
    m.lngLat = [-80.6, -5.18]
    await act(async () => m.dragend!())
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(-5.18, -80.6))
  })

  it('without a map key it says the map is unavailable', () => {
    render(<LocationPickerMap token="" latitude={null} longitude={null} onChange={() => {}} />)
    expect(screen.getByText(/El mapa no está disponible/)).toBeDefined()
  })
})
