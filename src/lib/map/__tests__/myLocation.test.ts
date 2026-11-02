// My Location on the website (ADR-046 #4) with the ADR-040 rule, the same
// as the app's home_map_default_view.dart: in the Piura region → there, at
// street level; outside it, or no location → the default Piura view.
import { describe, it, expect, vi } from 'vitest'
import { myLocationTarget, HOME_DEFAULT_VIEW, isInPiuraRegion, currentPosition } from '../myLocation'

describe('myLocationTarget', () => {
  it('inside the Piura region goes there at zoom 15', () => {
    expect(myLocationTarget({ lat: -5.19, lng: -80.63 })).toEqual({ lat: -5.19, lng: -80.63, zoom: 15 })
  })
  it('outside (Lima) goes to the default Piura view', () => {
    expect(myLocationTarget({ lat: -12.05, lng: -77.04 })).toEqual(HOME_DEFAULT_VIEW)
  })
  it('no location goes to the default Piura view', () => {
    expect(myLocationTarget(null)).toEqual(HOME_DEFAULT_VIEW)
  })
  it('the default view is the app one, between Piura and Sullana at zoom 9', () => {
    expect(HOME_DEFAULT_VIEW).toEqual({ lat: -5.0492, lng: -80.659, zoom: 9 })
  })
  it('the region box is the app one', () => {
    expect(isInPiuraRegion({ lat: -6.4, lng: -81.4 })).toBe(true)
    expect(isInPiuraRegion({ lat: -6.41, lng: -80 })).toBe(false)
    expect(isInPiuraRegion({ lat: -4, lng: -79.0 })).toBe(false)
  })
})

describe('currentPosition', () => {
  it('resolves the position', async () => {
    const geo = { getCurrentPosition: vi.fn((ok: PositionCallback) => ok({ coords: { latitude: -5.1, longitude: -80.6 } } as GeolocationPosition)) }
    await expect(currentPosition(geo as unknown as Geolocation)).resolves.toEqual({ lat: -5.1, lng: -80.6 })
  })
  it('a refusal or error resolves null', async () => {
    const geo = { getCurrentPosition: vi.fn((_ok: PositionCallback, err: PositionErrorCallback) => err({ code: 1 } as GeolocationPositionError)) }
    await expect(currentPosition(geo as unknown as Geolocation)).resolves.toBeNull()
  })
  it('no geolocation resolves null', async () => {
    await expect(currentPosition(undefined)).resolves.toBeNull()
  })
})
