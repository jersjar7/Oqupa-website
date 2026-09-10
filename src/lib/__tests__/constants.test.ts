import { describe, it, expect } from 'vitest'
import {
  PLAY_STORE_URL,
  APP_URL_SCHEME,
  CONTACT_EMAIL,
  PIURA_CENTER,
  DEFAULT_ZOOM,
  GOOGLE_MAP_ID,
  BOUNDARY_LAYERS,
  type BoundaryLayerConfig,
} from '../constants'

describe('constants', () => {
  it('PLAY_STORE_URL is a valid Google Play URL', () => {
    expect(PLAY_STORE_URL).toMatch(/^https:\/\/play\.google\.com\//)
    expect(PLAY_STORE_URL).toContain('com.oqupa.app')
  })

  it('APP_URL_SCHEME is the oqupa deep link scheme', () => {
    expect(APP_URL_SCHEME).toBe('oqupa://')
  })

  it('CONTACT_EMAIL is admin@oqupa.com', () => {
    expect(CONTACT_EMAIL).toBe('admin@oqupa.com')
  })

  it('PIURA_CENTER has lat and lng properties', () => {
    expect(typeof PIURA_CENTER.lat).toBe('number')
    expect(typeof PIURA_CENTER.lng).toBe('number')
  })

  it('PIURA_CENTER coordinates are in the correct range for Piura, Peru', () => {
    // Piura is roughly at -5.19°N, -80.63°E
    expect(PIURA_CENTER.lat).toBeGreaterThan(-6)
    expect(PIURA_CENTER.lat).toBeLessThan(-4)
    expect(PIURA_CENTER.lng).toBeGreaterThan(-81)
    expect(PIURA_CENTER.lng).toBeLessThan(-80)
  })

  it('DEFAULT_ZOOM is a reasonable map zoom level', () => {
    expect(DEFAULT_ZOOM).toBeGreaterThanOrEqual(10)
    expect(DEFAULT_ZOOM).toBeLessThanOrEqual(20)
  })

  it('GOOGLE_MAP_ID is a non-empty string', () => {
    expect(typeof GOOGLE_MAP_ID).toBe('string')
    expect(GOOGLE_MAP_ID.length).toBeGreaterThan(0)
  })

  it('BOUNDARY_LAYERS is a non-empty array', () => {
    expect(Array.isArray(BOUNDARY_LAYERS)).toBe(true)
    expect(BOUNDARY_LAYERS.length).toBeGreaterThan(0)
  })

  it('each boundary layer has the required config fields', () => {
    for (const layer of BOUNDARY_LAYERS) {
      expect(typeof layer.url).toBe('string')
      expect(typeof layer.label).toBe('string')
      expect(typeof layer.fillColor).toBe('string')
      expect(typeof layer.fillOpacity).toBe('number')
      expect(typeof layer.strokeColor).toBe('string')
      expect(typeof layer.strokeWeight).toBe('number')
      expect(typeof layer.zIndex).toBe('number')
    }
  })

  it('first boundary layer is for Departamento de Piura', () => {
    const first = BOUNDARY_LAYERS[0]!
    expect(first.label).toContain('Piura')
    expect(first.url).toContain('.geojson')
  })
})
