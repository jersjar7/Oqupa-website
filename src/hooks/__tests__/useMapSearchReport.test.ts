import { describe, it, expect } from 'vitest'
import { searchFrom } from '../useMapSearchReport'

const item = (distrito: string) => ({ property: { location: { distrito } } })
const filters = (over = {}) => ({ operationType: 'alquiler', priceMin: 800, priceMax: 1200, priceCurrency: 'PEN' as const, ...over })

describe('searchFrom (ADR-058 R6)', () => {
  it('the side, the price in soles and the districts on screen, each once', () => {
    expect(searchFrom(filters(), [item('Castilla'), item('CASTILLA '), item('26 de Octubre')], 3.44))
      .toEqual({ side: 'alquiler', priceMin: 800, priceMax: 1200, districts: ['PE200104', 'PE200115'] })
  })

  it('dollars become soles', () => {
    expect(searchFrom(filters({ operationType: 'venta', priceMin: 100000, priceMax: null, priceCurrency: 'USD' }), [item('Piura')], 3.44))
      .toEqual({ side: 'venta', priceMin: 344000, priceMax: null, districts: ['PE200101'] })
  })

  it('a wide look over more than 6 districts, an empty map or an unknown district is not a search', () => {
    const seven = ['Piura', 'Castilla', 'Catacaos', 'Sullana', 'Paita', 'Sechura', 'Tambogrande'].map(item)
    expect(searchFrom(filters(), seven, 3.44)).toBeNull()
    expect(searchFrom(filters(), [], 3.44)).toBeNull()
    expect(searchFrom(filters(), [item('Chato')], 3.44)).toBeNull()
  })
})
