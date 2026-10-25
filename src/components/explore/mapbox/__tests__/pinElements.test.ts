// @vitest-environment jsdom
// The website's map pins, word groups and district cards say exactly what the
// app's do (map plan steps 2 and 4, ADR-031).
import { describe, it, expect, vi } from 'vitest'
import { createPinElement, createGroupElement, createDistrictCardElement, PIN_COLORS } from '../pinElements'
import { mapListing } from '@/lib/map/__tests__/mapListingFixture'

describe('createPinElement', () => {
  it('a casa for sale: drawing, "CASA", the price; blue', () => {
    const el = createPinElement(mapListing({ amount: 98000, currency: 'USD' }), { selected: false })
    expect(el.textContent).toContain('CASA')
    expect(el.textContent).toContain('US$ 98 mil')
    expect(el.querySelector('svg')).not.toBeNull()
    expect(el.dataset.kind).toBe('casa')
    expect(el.querySelector<HTMLElement>('[data-role="pill"]')!.style.backgroundColor).toBe('rgb(0, 91, 141)')
    expect(PIN_COLORS.venta).toBe('#005B8D')
  })
  it('a terreno shows its size', () => {
    const el = createPinElement(mapListing({ type: 'terreno', area: 300, amount: 45000 }), { selected: false })
    expect(el.textContent).toContain('TERRENO · 300 m²')
  })
  it('rent is orange and says "al mes" / "la noche"', () => {
    const month = createPinElement(mapListing({ operation: 'alquiler', amount: 1200, currency: 'PEN', type: 'departamento' }), { selected: false })
    expect(month.textContent).toContain('S/. 1,200 al mes')
    expect(month.querySelector<HTMLElement>('[data-role="pill"]')!.style.backgroundColor).toBe('rgb(179, 78, 0)')
    expect(PIN_COLORS.alquiler).toBe('#B34E00')
    const night = createPinElement(mapListing({ operation: 'alquiler', rental: 'shortTerm', amount: 120, currency: 'PEN', type: 'hospedaje' }), { selected: false })
    expect(night.textContent).toContain('ALOJAMIENTO')
    expect(night.textContent).toContain('S/. 120 la noche')
  })
  it('selected: near-black and larger', () => {
    const el = createPinElement(mapListing(), { selected: true })
    expect(el.querySelector<HTMLElement>('[data-role="pill"]')!.style.backgroundColor).toBe('rgb(15, 23, 42)')
    expect(el.dataset.selected).toBe('1')
  })
  it('boosted: a sparkle before the type word', () => {
    expect(createPinElement(mapListing({ boosted: true }), { selected: false }).textContent).toContain('✦')
  })
  it('a real button, named for screen readers', () => {
    const el = createPinElement(mapListing({ amount: 98000, currency: 'USD' }), { selected: false })
    const button = el.querySelector('button')!
    expect(button.getAttribute('aria-label')).toBe('CASA, US$ 98 mil')
  })
})

describe('createGroupElement', () => {
  it('"5 aquí" and "Toca para ver" — never a bare number', () => {
    const onTap = vi.fn()
    const el = createGroupElement(5, true, onTap)
    expect(el.textContent).toContain('5 aquí')
    expect(el.textContent).toContain('Toca para ver')
    el.querySelector('button')!.click()
    expect(onTap).toHaveBeenCalledOnce()
  })
})

describe('createDistrictCardElement', () => {
  it('"Castilla" over "22 en venta"', () => {
    const onTap = vi.fn()
    const el = createDistrictCardElement('Castilla', 22, true, onTap)
    expect(el.textContent).toContain('Castilla')
    expect(el.textContent).toContain('22 en venta')
    el.querySelector('button')!.click()
    expect(onTap).toHaveBeenCalledOnce()
  })
  it('rent mode says "en alquiler"', () => {
    expect(createDistrictCardElement('Piura', 4, false, () => {}).textContent).toContain('4 en alquiler')
  })
})
