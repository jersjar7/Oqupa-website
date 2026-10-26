// @vitest-environment jsdom
// Computer: the filters float on the map instead of taking a full row above it
// (UX review 2026-10-25): Venta / Alquiler, and Filtros, which opens the rest
// (type, price). The count lives in the list's own heading already.
import { describe, it, expect } from 'vitest'
import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import MapFilterBar from '../MapFilterBar'
import type { MapFilters } from '@/types/explore'

function Harness({ start }: { start?: Partial<MapFilters> }) {
  const [filters, setFilters] = useState<MapFilters>({ operationType: 'venta', rentalDurationType: null, propertyTypes: [], priceMin: null, priceMax: null, ...start })
  return (
    <>
      <MapFilterBar filters={filters} setFilters={setFilters} />
      <p data-testid="op">{filters.operationType}</p>
    </>
  )
}

describe('MapFilterBar', () => {
  it('Venta / Alquiler switch right on the map', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Alquiler' }))
    expect(screen.getByTestId('op').textContent).toBe('alquiler')
  })
  it('Filtros opens the type and price filters, and closes again', () => {
    render(<Harness />)
    expect(screen.queryByLabelText('Precio mínimo')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /filtros/i }))
    expect(screen.getByLabelText('Precio mínimo')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Casa' })).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: /listo/i }))
    expect(screen.queryByLabelText('Precio mínimo')).toBeNull()
  })
  it('the open panel does not repeat Venta / Alquiler or the count', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: /filtros/i }))
    expect(screen.getAllByRole('button', { name: 'Venta' })).toHaveLength(1)
    expect(document.body.textContent).not.toMatch(/de \d+ propiedades/)
  })
  it('Filtros shows how many are on', () => {
    render(<Harness start={{ propertyTypes: ['casa'] }} />)
    expect(screen.getByRole('button', { name: /filtros/i }).textContent).toContain('1')
  })
})
