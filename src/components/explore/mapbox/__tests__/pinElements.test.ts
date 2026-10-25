// @vitest-environment jsdom
// The website's map pins, word groups, dots and boosted photo pins look and say
// exactly what the app's do — style A (ADR-031 items 15–18). The first version
// of these tests pinned the solid-colour pills of map plan step 2; Jerson chose
// style A on 2026-10-24, so the colour now lives in the small circle.
import { describe, it, expect, vi } from 'vitest'
import { createPinElement, createGroupElement, createDotElement, createBoostedPinElement, createRaisedPinElement, PIN_COLORS, RAISED_LEADER_PX } from '../pinElements'
import { mapListing } from '@/lib/map/__tests__/mapListingFixture'

describe('createPinElement', () => {
  it('a casa for sale: drawing, "CASA", the price; blue', () => {
    const el = createPinElement(mapListing({ amount: 98000, currency: 'USD' }), { selected: false })
    expect(el.textContent).toContain('CASA')
    expect(el.textContent).toContain('US$ 98 mil')
    expect(el.querySelector('svg')).not.toBeNull()
    expect(el.dataset.kind).toBe('casa')
    // Style A: a white pill; the colour is in the circle around the drawing.
    expect(el.querySelector<HTMLElement>('[data-role="pill"]')!.style.backgroundColor).toBe('rgb(255, 255, 255)')
    expect(el.querySelector<HTMLElement>('[data-role="circle"]')!.style.backgroundColor).toBe('rgb(0, 91, 141)')
    expect(PIN_COLORS.venta).toBe('#005B8D')
  })
  it('a terreno shows its size', () => {
    const el = createPinElement(mapListing({ type: 'terreno', area: 300, amount: 45000 }), { selected: false })
    expect(el.textContent).toContain('TERRENO · 300 m²')
  })
  it('rent is orange and says "al mes" / "la noche"', () => {
    const month = createPinElement(mapListing({ operation: 'alquiler', amount: 1200, currency: 'PEN', type: 'departamento' }), { selected: false })
    expect(month.textContent).toContain('S/. 1,200 al mes')
    expect(month.querySelector<HTMLElement>('[data-role="circle"]')!.style.backgroundColor).toBe('rgb(179, 78, 0)')
    expect(PIN_COLORS.alquiler).toBe('#B34E00')
    const night = createPinElement(mapListing({ operation: 'alquiler', rental: 'shortTerm', amount: 120, currency: 'PEN', type: 'hospedaje' }), { selected: false })
    expect(night.textContent).toContain('ALOJAMIENTO')
    expect(night.textContent).toContain('S/. 120 la noche')
  })
  it('selected: a dark pill (#111827, as in the app) and larger', () => {
    const el = createPinElement(mapListing(), { selected: true })
    expect(el.querySelector<HTMLElement>('[data-role="pill"]')!.style.backgroundColor).toBe('rgb(17, 24, 39)')
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
    const el = createGroupElement(5, true, onTap, 'touch')
    expect(el.textContent).toContain('5 aquí')
    expect(el.textContent).toContain('Toca para ver')
    el.querySelector('button')!.click()
    expect(onTap).toHaveBeenCalledOnce()
  })

  // A computer has a mouse: "Toca" there was the mistake (2026-10-24).
  it('with a mouse it says "Click para ver", never "Toca"', () => {
    const el = createGroupElement(5, true, vi.fn(), 'mouse')
    expect(el.textContent).toContain('Click para ver')
    expect(el.textContent).not.toMatch(/toca/i)
    expect(el.querySelector('button')!.getAttribute('aria-label')).toBe('5 propiedades aquí, haz clic para ver')
  })
})

describe('createDotElement (far out)', () => {
  it('a small coloured dot with the type drawing — no words, no count', () => {
    const onTap = vi.fn()
    const el = createDotElement(mapListing({ type: 'terreno' }), onTap)
    const dot = el.querySelector<HTMLElement>('button')!
    expect(dot.style.width).toBe('19px')
    expect(dot.style.backgroundColor).toBe('rgb(0, 91, 141)')
    expect(dot.querySelector('svg')).not.toBeNull()
    expect(el.textContent).toBe('')
    expect(dot.getAttribute('aria-label')).toContain('TERRENO')
    dot.click()
    expect(onTap).toHaveBeenCalledOnce()
  })
  it('rent mode is orange', () => {
    expect(createDotElement(mapListing({ operation: 'alquiler' }), () => {}).querySelector<HTMLElement>('button')!.style.backgroundColor).toBe('rgb(179, 78, 0)')
  })
  it('a boosted listing: the same dot and drawing, with a gold edge and no photo', () => {
    const el = createDotElement(mapListing({ boosted: true, photos: 2 }), () => {})
    const dot = el.querySelector<HTMLElement>('button')!
    expect(dot.style.width).toBe('19px')
    expect(dot.style.borderColor).toBe('rgb(245, 158, 11)')
    expect(dot.querySelector('svg')).not.toBeNull()
    expect(el.querySelector('img')).toBeNull()
    expect(createDotElement(mapListing({}), () => {}).querySelector<HTMLElement>('button')!.style.borderColor).toBe('rgb(255, 255, 255)')
  })
})

describe('createBoostedPinElement (city and close)', () => {
  // 21 px since ADR-033 (smaller pins, Jerson 2026-10-25); was 24.
  it('the same size as a normal pin: a 21-px circle, gold edge, "✦ CASA" and the price', () => {
    const el = createBoostedPinElement(mapListing({ boosted: true, amount: 98000, currency: 'USD', photos: 2 }), { selected: false })
    const circle = el.querySelector<HTMLElement>('[data-role="circle"]')!
    expect(circle.style.width).toBe('21px')
    const normal = createPinElement(mapListing({ amount: 98000, currency: 'USD' }), { selected: false })
    expect(el.querySelector<HTMLElement>('[data-role="pill"]')!.style.padding)
      .toBe(normal.querySelector<HTMLElement>('[data-role="pill"]')!.style.padding)
    expect(el.querySelector<HTMLElement>('[data-role="pill"]')!.style.borderColor).toBe('rgb(245, 158, 11)')
    expect(el.textContent).toContain('✦ CASA')
    expect(el.textContent).toContain('US$ 98 mil')
  })
  it('shows the drawing until the first photo loads, then the photo', () => {
    const el = createBoostedPinElement(mapListing({ boosted: true, photos: 2 }), { selected: false })
    const img = el.querySelector<HTMLImageElement>('img')!
    expect(img.getAttribute('src')).toContain('property-photos/x/0.webp')
    expect(img.style.display).toBe('none')
    expect(el.querySelector('[data-role="circle"] svg')).not.toBeNull()
    img.dispatchEvent(new Event('load'))
    expect(img.style.display).toBe('block')
    expect(el.querySelector('[data-role="circle"] svg')).toBeNull()
  })
  it('a photo that fails to load keeps the drawing', () => {
    const el = createBoostedPinElement(mapListing({ boosted: true, photos: 1 }), { selected: false })
    el.querySelector('img')!.dispatchEvent(new Event('error'))
    expect(el.querySelector('[data-role="circle"] svg')).not.toBeNull()
  })
  it('no photo at all: just the drawing', () => {
    const el = createBoostedPinElement(mapListing({ boosted: true, photos: 0 }), { selected: false })
    expect(el.querySelector('img')).toBeNull()
    expect(el.querySelector('[data-role="circle"] svg')).not.toBeNull()
  })
})

// ADR-033 (Jerson, 2026-10-25): the smaller pins he chose from side-by-side
// renders — same design, smaller text, lines closer together.
describe('pin text size (ADR-033)', () => {
  it('type word 9 px, price 12.5 px, lines close together', () => {
    const el = createPinElement(mapListing({ amount: 98000, currency: 'USD' }), { selected: false })
    const [type, price] = [...el.querySelectorAll<HTMLElement>('[data-role="pill"] span span')]
    expect(type!.style.fontSize).toBe('9px')
    expect(price!.style.fontSize).toBe('12.5px')
    expect((type!.parentElement as HTMLElement).style.lineHeight).toBe('1')
  })
})

// ADR-033: a tapped dot's pin rises on a leader line from the dot's exact
// spot; the map does not move. Clicking the raised pin opens the listing.
describe('createRaisedPinElement', () => {
  it('the listing\'s pin above a line that grows to full length', async () => {
    const onOpen = vi.fn()
    const el = createRaisedPinElement(mapListing({ amount: 98000, currency: 'USD' }), onOpen)
    expect(el.textContent).toContain('US$ 98 mil')
    const line = el.querySelector<HTMLElement>('[data-role="leader"]')!
    expect(line.style.height).toBe('0px')
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    expect(line.style.height).toBe(`${RAISED_LEADER_PX}px`)
  })
  it('the line ends at the dot\'s top edge, so the dot stays visible', () => {
    const el = createRaisedPinElement(mapListing(), vi.fn())
    expect(el.lastElementChild!.getAttribute('data-role')).toBe('dot-gap')
    expect((el.lastElementChild as HTMLElement).style.height).toBe('9.5px')
  })
  it('a click opens the listing', () => {
    const onOpen = vi.fn()
    createRaisedPinElement(mapListing(), onOpen).querySelector('button')!.click()
    expect(onOpen).toHaveBeenCalledOnce()
  })
  it('a boosted listing rises as its gold pin', () => {
    const el = createRaisedPinElement(mapListing({ boosted: true, photos: 1 }), vi.fn())
    expect(el.textContent).toContain('✦')
    expect(el.querySelector<HTMLElement>('[data-role="pill"]')!.style.borderColor).toBe('rgb(245, 158, 11)')
  })
})
