import { describe, it, expect, beforeEach, vi } from 'vitest'
import { browserPlace, resetBrowserPlace } from '../browserPlace'

const nav = (state: PermissionState, coords = { latitude: -5.194512, longitude: -80.632834 }) => ({
  permissions: { query: vi.fn(async () => ({ state })) },
  geolocation: { getCurrentPosition: vi.fn((ok: (p: { coords: typeof coords }) => void) => ok({ coords })) },
}) as unknown as Pick<Navigator, 'permissions' | 'geolocation'>

describe('browserPlace (ADR-058 R2)', () => {
  beforeEach(() => resetBrowserPlace())

  it('only with permission already granted, rounded to about 100 m', async () => {
    expect(await browserPlace(nav('granted'), 1)).toEqual({ lat: -5.195, lng: -80.633 })
  })

  it('never asks: "prompt" or "denied" means no place, and getCurrentPosition is not called', async () => {
    const n = nav('prompt')
    expect(await browserPlace(n, 1)).toBeNull()
    expect(n.geolocation.getCurrentPosition).not.toHaveBeenCalled()
    resetBrowserPlace()
    expect(await browserPlace(nav('denied'), 1)).toBeNull()
  })

  it('no permissions API: no place', async () => {
    expect(await browserPlace({} as Pick<Navigator, 'permissions' | 'geolocation'>, 1)).toBeNull()
  })
})
