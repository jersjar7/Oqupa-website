// @vitest-environment jsdom
// Phone: one bar at the bottom instead of two stacked buttons (UX review
// 2026-10-25): "VER LISTA · 9 en venta" (or "VER MAPA") and Filtros, side by
// side in one pill. Filtros shows how many filters are on.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PhoneMapBar from '../PhoneMapBar'

describe('PhoneMapBar', () => {
  it('both actions in one bar', () => {
    const onToggleList = vi.fn()
    const onOpenFilters = vi.fn()
    render(<PhoneMapBar mode="map" count={9} isVenta activeFilters={0} onToggleList={onToggleList} onOpenFilters={onOpenFilters} />)
    const bar = screen.getByTestId('phone-map-bar')
    expect(bar.querySelectorAll('button')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: /ver lista/i }))
    expect(onToggleList).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: /filtros/i }))
    expect(onOpenFilters).toHaveBeenCalledOnce()
  })
  it('in the list it offers VER MAPA', () => {
    render(<PhoneMapBar mode="list" count={9} isVenta activeFilters={0} onToggleList={() => {}} onOpenFilters={() => {}} />)
    expect(screen.getByRole('button', { name: /ver mapa/i })).toBeDefined()
  })
  it('Filtros shows how many filters are on, and nothing when none', () => {
    const { rerender } = render(<PhoneMapBar mode="map" count={9} isVenta activeFilters={2} onToggleList={() => {}} onOpenFilters={() => {}} />)
    expect(screen.getByRole('button', { name: /filtros/i }).textContent).toContain('2')
    rerender(<PhoneMapBar mode="map" count={9} isVenta activeFilters={0} onToggleList={() => {}} onOpenFilters={() => {}} />)
    expect(screen.getByRole('button', { name: /filtros/i }).textContent).not.toMatch(/\d/)
  })
})
