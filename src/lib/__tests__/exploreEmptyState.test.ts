import { describe, it, expect } from 'vitest'
import { getExploreEmptyMessage, exploreLoadErrorMessage } from '../exploreEmptyState'

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
      'No hay propiedades en esta parte del mapa. Aléjalo con dos dedos para ver más.',
    )
  })

  it('returns the "zoom out" message when filteredCount equals total', () => {
    expect(getExploreEmptyMessage(10, 10)).toBe(
      'No hay propiedades en esta parte del mapa. Aléjalo con dos dedos para ver más.',
    )
  })
})

// Audit 2026-11-02: the map's load error said why only as "Error al cargar".
describe('exploreLoadErrorMessage', () => {
  it('offline', () => expect(exploreLoadErrorMessage(false)).toBe('Sin conexión. Revisa tu internet y toca Reintentar.'))
  it('online', () => expect(exploreLoadErrorMessage(true)).toBe('No pudimos cargar las propiedades. Toca Reintentar.'))
})
