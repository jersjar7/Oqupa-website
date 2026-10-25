// The DOM for the website's map markers — map plan steps 2 and 4 (ADR-031).
// Same words, drawings and colours as the app's pins: a drawing of the type,
// the type in words, the full price. Plain DOM (not React) because Mapbox owns
// the marker elements; every marker is a real <button> so it is reachable by
// keyboard and named for screen readers.
import { pinLabelFor, type PinKind } from '@/lib/map/pinLabel'
import { districtCountLine } from '@/lib/map/districtGroups'
import type { ListingWithProperty } from '@/types/explore'

export const PIN_COLORS = {
  venta: '#005B8D',
  alquiler: '#B34E00',
  selected: '#0F172A',
} as const

/** One simple drawing per type, white on the pin's colour (inline SVG). */
const DRAWINGS: Record<PinKind, string> = {
  casa: '<path d="M2 10 L11 2 L20 10 V19 H2 Z" fill="#fff"/><rect x="9" y="13" width="4" height="6" fill="currentColor"/>',
  terreno: '<rect x="2" y="12" width="18" height="6" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 2"/><path d="M6 12 V3 L13 5.5 L6 8" fill="#fff" stroke="#fff" stroke-width="1.5"/>',
  departamento: '<rect x="5" y="2" width="12" height="17" fill="#fff"/><rect x="8" y="5" width="2" height="2" fill="currentColor"/><rect x="12" y="5" width="2" height="2" fill="currentColor"/><rect x="8" y="9" width="2" height="2" fill="currentColor"/><rect x="12" y="9" width="2" height="2" fill="currentColor"/><rect x="10" y="14" width="2" height="5" fill="currentColor"/>',
  local: '<path d="M2 3 H20 L18 8 H4 Z" fill="#fff"/><rect x="4" y="9" width="14" height="10" fill="#fff"/><rect x="7" y="12" width="4" height="7" fill="currentColor"/>',
  oficina: '<rect x="3" y="2" width="16" height="17" fill="#fff"/><rect x="6" y="5" width="4" height="3" fill="currentColor"/><rect x="12" y="5" width="4" height="3" fill="currentColor"/><rect x="6" y="10" width="10" height="2" fill="currentColor"/><rect x="9" y="14" width="4" height="5" fill="currentColor"/>',
  alojamiento: '<rect x="2" y="10" width="18" height="6" rx="1" fill="#fff"/><rect x="2" y="6" width="6" height="5" rx="1" fill="#fff"/><rect x="2" y="16" width="2" height="3" fill="#fff"/><rect x="18" y="16" width="2" height="3" fill="#fff"/>',
  cuarto: '<rect x="5" y="2" width="12" height="17" rx="1" fill="#fff"/><circle cx="14" cy="11" r="1.4" fill="currentColor"/>',
}

export function drawingSvg(kind: PinKind, size = 20, color = '#005B8D'): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 22 20" aria-hidden="true" style="color:${color};flex:none">${DRAWINGS[kind]}</svg>`
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, css: Partial<CSSStyleDeclaration> = {}): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  Object.assign(e.style, css)
  return e
}

const FONT = 'Montserrat, Gotham, system-ui, sans-serif'

function pointer(color: string): HTMLDivElement {
  return el('div', {
    width: '0', height: '0', margin: '0 auto',
    borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: `9px solid ${color}`,
  })
}

export function createPinElement(item: ListingWithProperty, state: { selected: boolean }): HTMLDivElement {
  const label = pinLabelFor(item)
  const isVenta = item.property.operationType !== 'alquiler'
  const color = state.selected ? PIN_COLORS.selected : isVenta ? PIN_COLORS.venta : PIN_COLORS.alquiler
  const root = el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' })
  root.dataset.kind = label.kind
  root.dataset.listingId = item.listing.id
  root.dataset.selected = state.selected ? '1' : ''

  const button = el('button', {
    display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 10px', borderRadius: '12px',
    border: '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.22)', color: '#fff', fontFamily: FONT,
    cursor: 'pointer', transform: state.selected ? 'scale(1.15)' : '', transformOrigin: 'bottom center',
  })
  button.type = 'button'
  button.dataset.role = 'pill'
  button.style.backgroundColor = color
  button.setAttribute('aria-label', `${label.typeLine}, ${label.priceLine}`)
  button.innerHTML = drawingSvg(label.kind, 20, color)
  const words = el('span', { display: 'flex', flexDirection: 'column', lineHeight: '1.1', textAlign: 'left' })
  const type = el('span', { fontSize: '10.5px', fontWeight: '700', letterSpacing: '0.4px', whiteSpace: 'nowrap' })
  type.textContent = item.listing.isBoosted ? `✦ ${label.typeLine}` : label.typeLine
  const price = el('span', { fontSize: '14.5px', fontWeight: '700', whiteSpace: 'nowrap' })
  price.textContent = label.priceLine
  words.append(type, price)
  button.append(words)
  root.append(button, pointer(color))
  return root
}

export function createGroupElement(count: number, isVenta: boolean, onTap: () => void): HTMLDivElement {
  const border = isVenta ? PIN_COLORS.venta : PIN_COLORS.alquiler
  const root = el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' })
  const button = el('button', {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '12px',
    background: '#fff', border: `2px solid ${border}`, boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    color: '#1F2937', fontFamily: FONT, cursor: 'pointer',
  })
  button.type = 'button'
  button.setAttribute('aria-label', `${count} propiedades aquí, toca para ver`)
  button.innerHTML = `<svg width="26" height="18" viewBox="0 0 26 20" aria-hidden="true"><path d="M1 10 L7 4 L13 10 V19 H1 Z" fill="${border}"/><rect x="14" y="5" width="10" height="14" fill="${border}" opacity="0.7"/></svg>`
  const words = el('span', { display: 'flex', flexDirection: 'column', lineHeight: '1.1', textAlign: 'left' })
  const n = el('span', { fontSize: '14.5px', fontWeight: '700', whiteSpace: 'nowrap' })
  n.textContent = `${count} aquí`
  const hint = el('span', { fontSize: '11px', color: '#4B5563', whiteSpace: 'nowrap' })
  hint.textContent = 'Toca para ver'
  words.append(n, hint)
  button.append(words)
  button.addEventListener('click', (e) => {
    e.stopPropagation()
    onTap()
  })
  root.append(button, pointer(border))
  return root
}

export function createDistrictCardElement(name: string, count: number, isVenta: boolean, onTap: () => void): HTMLDivElement {
  const border = isVenta ? PIN_COLORS.venta : PIN_COLORS.alquiler
  const root = el('div')
  const button = el('button', {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '9px 14px', borderRadius: '14px',
    background: '#fff', border: `2px solid ${border}`, boxShadow: '0 3px 10px rgba(0,0,0,0.18)',
    color: '#1F2937', fontFamily: FONT, cursor: 'pointer', textAlign: 'left',
  })
  button.type = 'button'
  const title = el('span', { fontSize: '17px', fontWeight: '700', whiteSpace: 'nowrap' })
  title.textContent = name
  const line = el('span', { fontSize: '13px', marginTop: '2px', whiteSpace: 'nowrap' })
  line.textContent = districtCountLine(count, isVenta)
  button.setAttribute('aria-label', `${name}, ${line.textContent}`)
  button.append(title, line)
  button.addEventListener('click', (e) => {
    e.stopPropagation()
    onTap()
  })
  root.append(button)
  return root
}
