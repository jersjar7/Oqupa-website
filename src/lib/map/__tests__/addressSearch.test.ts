import { describe, it, expect, vi } from 'vitest'
import { searchAddresses, PIURA_BBOX } from '../addressSearch'

const feature = (name: string, lng: number, lat: number, type = 'street') => ({
  id: name,
  geometry: { coordinates: [lng, lat] },
  properties: { feature_type: type, name, place_formatted: 'Castilla, Departamento de Piura, Perú' },
})

function fakeFetch(features: unknown[], ok = true) {
  return vi.fn(async (_url: string) => ({ ok, status: ok ? 200 : 401, json: async () => ({ features }) })) as unknown as typeof fetch
}

describe('searchAddresses (ADR-043 D6)', () => {
  it('asks Mapbox for Peru, inside the Piura box, in Spanish, near the person', async () => {
    const f = fakeFetch([])
    await searchAddresses('Av Grau 123', { token: 'pk.x', near: { lat: -5.19, lng: -80.63 }, fetchFn: f })
    const url = new URL((f as unknown as { mock: { calls: string[][] } }).mock.calls[0]![0]!)
    expect(url.host).toBe('api.mapbox.com')
    expect(url.searchParams.get('country')).toBe('pe')
    expect(url.searchParams.get('bbox')).toBe(PIURA_BBOX.join(','))
    expect(url.searchParams.get('language')).toBe('es')
    expect(url.searchParams.get('proximity')).toBe('-80.63,-5.19')
    expect(url.searchParams.get('q')).toBe('Av Grau 123')
  })

  it('returns places in Piura only, streets marked', async () => {
    const f = fakeFetch([
      feature('Avenida Grau', -80.6255, -5.2138),
      feature('Lima', -77.03, -12.04, 'place'),
      feature('Castilla', -80.6, -5.19, 'locality'),
    ])
    const r = await searchAddresses('grau', { token: 'pk.x', fetchFn: f })
    expect(r.map((x) => x.name)).toEqual(['Avenida Grau', 'Castilla'])
    expect(r[0]).toMatchObject({ latitude: -5.2138, longitude: -80.6255, isStreet: true })
    expect(r[1]!.isStreet).toBe(false)
  })

  it('too short or no token: no request', async () => {
    const f = fakeFetch([])
    expect(await searchAddresses('Av', { token: 'pk.x', fetchFn: f })).toEqual([])
    expect(await searchAddresses('Av Grau', { token: '', fetchFn: f })).toEqual([])
    expect(f).not.toHaveBeenCalled()
  })

  it('a refused request throws (the page says so in Spanish)', async () => {
    await expect(searchAddresses('Av Grau', { token: 'pk.x', fetchFn: fakeFetch([], false) })).rejects.toThrow()
  })
})
