import { describe, it, expect } from 'vitest'
import { getExploreEmptyMessage } from '../exploreEmptyState'

describe('getExploreEmptyMessage', () => {
  it('returns the "launching" message when total is 0', () => {
    expect(getExploreEmptyMessage(0, 0)).toBe(
      'Estamos empezando en Piura. Pronto habrá propiedades aquí.',
    )
  })

  it('returns the "launching" message even when filteredCount is > 0 but total is 0', () => {
    // total === 0 takes precedence
    expect(getExploreEmptyMessage(0, 5)).toBe(
      'Estamos empezando en Piura. Pronto habrá propiedades aquí.',
    )
  })

  it('returns the "filter mismatch" message when total > 0 but filteredCount is 0', () => {
    expect(getExploreEmptyMessage(50, 0)).toBe(
      'No se encontraron propiedades con los filtros seleccionados.',
    )
  })

  it('returns the "zoom out" message when total > 0 and filteredCount > 0', () => {
    expect(getExploreEmptyMessage(50, 10)).toBe(
      'No hay propiedades en esta zona del mapa. Aleja el zoom o navega a otra ubicación.',
    )
  })

  it('returns the "zoom out" message when filteredCount equals total', () => {
    expect(getExploreEmptyMessage(10, 10)).toBe(
      'No hay propiedades en esta zona del mapa. Aleja el zoom o navega a otra ubicación.',
    )
  })
})
