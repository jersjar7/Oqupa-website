// The DOM for the website's map markers — style A (ADR-031 items 15–18), the
// same as the app's MapMarkerPainter: a white pill with a small coloured circle
// holding the type drawing, the type word in small grey letters and the price in
// bold, with a point at the bottom. Far out, a small coloured dot per listing.
// Boosted listings: a bigger pill with the first photo in a 48-px gold-edged
// circle. Plain DOM (not React) because Mapbox owns the marker elements; every
// marker is a real <button>, reachable by keyboard and named for screen readers.
import { pinLabelFor, type PinKind } from '@/lib/map/pinLabel'
import { buildImageUrl } from '@/lib/imageUrl'
import type { ListingWithProperty } from '@/types/explore'

export const PIN_COLORS = {
  venta: '#005B8D',
  alquiler: '#B34E00',
  selected: '#111827',
  word: '#6B7280',
  gold: '#F59E0B',
  amberWord: '#B45309',
} as const

/** Same sizes as the app (MapMarkerPainter). */
export const PIN_CIRCLE_PX = 24
export const BOOSTED_PHOTO_PX = 48
export const DOT_PX = 19

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

function pointer(color: string, size = 7): HTMLDivElement {
  return el('div', {
    width: '0', height: '0', margin: '0 auto',
    borderLeft: `${size}px solid transparent`, borderRight: `${size}px solid transparent`, borderTop: `${size + 1}px solid ${color}`,
    filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.12))',
  })
}

const modeColor = (item: ListingWithProperty) =>
  item.property.operationType === 'alquiler' ? PIN_COLORS.alquiler : PIN_COLORS.venta

function circle(size: number, color: string, kind: PinKind): HTMLSpanElement {
  const c = el('span', {
    width: `${size}px`, height: `${size}px`, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flex: 'none', overflow: 'hidden', position: 'relative',
  })
  c.dataset.role = 'circle'
  c.style.backgroundColor = color
  c.innerHTML = drawingSvg(kind, Math.round(size * 0.58), color)
  return c
}

function pill(css: Partial<CSSStyleDeclaration>, background: string): HTMLButtonElement {
  const b = el('button', {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 11px 4px 4px', borderRadius: '999px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.18)', fontFamily: FONT, cursor: 'pointer', transformOrigin: 'bottom center',
    ...css,
  })
  b.type = 'button'
  b.dataset.role = 'pill'
  b.style.backgroundColor = background
  return b
}

function words(typeText: string, priceText: string, o: { wordColor: string; priceColor: string; priceSize: number }) {
  const w = el('span', { display: 'flex', flexDirection: 'column', lineHeight: '1.08', textAlign: 'left' })
  const type = el('span', { fontSize: '10.5px', fontWeight: '700', letterSpacing: '0.4px', whiteSpace: 'nowrap', color: o.wordColor })
  type.textContent = typeText
  const price = el('span', { fontSize: `${o.priceSize}px`, fontWeight: '700', whiteSpace: 'nowrap', color: o.priceColor })
  price.textContent = priceText
  w.append(type, price)
  return w
}

/** A normal listing's pin (style A). */
export function createPinElement(item: ListingWithProperty, state: { selected: boolean }): HTMLDivElement {
  const label = pinLabelFor(item)
  const color = modeColor(item)
  const root = el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' })
  root.dataset.kind = label.kind
  root.dataset.listingId = item.listing.id
  root.dataset.selected = state.selected ? '1' : ''
  const bg = state.selected ? PIN_COLORS.selected : '#FFFFFF'
  const button = pill(
    { border: '1px solid rgba(0,0,0,0.06)', transform: state.selected ? 'scale(1.15)' : '' },
    bg,
  )
  button.setAttribute('aria-label', `${label.typeLine}, ${label.priceLine}`)
  button.append(
    circle(PIN_CIRCLE_PX, color, label.kind),
    words(item.listing.isBoosted ? `✦ ${label.typeLine}` : label.typeLine, label.priceLine, {
      wordColor: state.selected ? '#E5E7EB' : PIN_COLORS.word,
      priceColor: state.selected ? '#FFFFFF' : PIN_COLORS.selected,
      priceSize: 14.5,
    }),
  )
  root.append(button, pointer(bg))
  return root
}

/** The first photo of a listing at map-pin size (96 px, like the app). */
export function boostedPhotoUrl(item: ListingWithProperty): string | null {
  const m = item.property.media
  const ref = m.photoKeys?.length ? m.photoKeys[0] : m.propertyPhotoUrls?.[0]
  return ref ? buildImageUrl(ref, { width: 96, quality: 70 }) : null
}

/** A boosted listing's pin: bigger, with its first photo, at every zoom. Shows
 *  the drawing until the photo has loaded (and if it never does). */
export function createBoostedPinElement(item: ListingWithProperty, state: { selected: boolean }): HTMLDivElement {
  const label = pinLabelFor(item)
  const color = modeColor(item)
  const root = el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' })
  root.dataset.kind = label.kind
  root.dataset.listingId = item.listing.id
  root.dataset.selected = state.selected ? '1' : ''
  root.dataset.boosted = '1'
  const bg = state.selected ? PIN_COLORS.selected : '#FFFFFF'
  const button = pill(
    { padding: '5px 14px 5px 5px', gap: '8px', borderWidth: '2px', borderStyle: 'solid', boxShadow: '0 4px 12px rgba(245,158,11,0.45)' },
    bg,
  )
  button.style.borderColor = PIN_COLORS.gold
  button.setAttribute('aria-label', `Destacado: ${label.typeLine}, ${label.priceLine}`)
  const c = circle(BOOSTED_PHOTO_PX, color, label.kind)
  c.style.boxShadow = `0 0 0 2px ${PIN_COLORS.gold}`
  const url = boostedPhotoUrl(item)
  if (url) {
    const img = el('img', { width: '100%', height: '100%', objectFit: 'cover', display: 'none', position: 'absolute', inset: '0' })
    img.alt = ''
    img.decoding = 'async'
    img.addEventListener('load', () => {
      img.style.display = 'block'
      c.querySelector('svg')?.remove()
    })
    img.setAttribute('src', url)
    c.append(img)
  }
  button.append(
    c,
    words(`✦ ${label.typeLine}`, label.priceLine, {
      wordColor: state.selected ? PIN_COLORS.gold : PIN_COLORS.amberWord,
      priceColor: state.selected ? '#FFFFFF' : PIN_COLORS.selected,
      priceSize: 16,
    }),
  )
  root.append(button, pointer(PIN_COLORS.gold, 8))
  return root
}

/** Far out: one small dot per listing, its type drawing inside. */
export function createDotElement(item: ListingWithProperty, onTap: () => void): HTMLDivElement {
  const label = pinLabelFor(item)
  const root = el('div', { display: 'flex' })
  root.dataset.listingId = item.listing.id
  const dot = el('button', {
    width: `${DOT_PX}px`, height: `${DOT_PX}px`, borderRadius: '50%', padding: '0',
    border: '1.5px solid #FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  })
  dot.type = 'button'
  dot.style.backgroundColor = modeColor(item)
  dot.setAttribute('aria-label', `${label.typeLine}, ${label.priceLine}. Acercar`)
  dot.innerHTML = drawingSvg(label.kind, 11, modeColor(item))
  dot.addEventListener('click', (e) => {
    e.stopPropagation()
    onTap()
  })
  root.append(dot)
  return root
}

/** Pins that would overlap: "N aquí", style A. */
export function createGroupElement(count: number, isVenta: boolean, onTap: () => void): HTMLDivElement {
  const color = isVenta ? PIN_COLORS.venta : PIN_COLORS.alquiler
  const root = el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center' })
  const button = pill({ border: '1px solid rgba(0,0,0,0.06)' }, '#FFFFFF')
  button.setAttribute('aria-label', `${count} propiedades aquí, toca para ver`)
  const badge = el('span', {
    width: `${PIN_CIRCLE_PX}px`, height: `${PIN_CIRCLE_PX}px`, borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flex: 'none', backgroundColor: PIN_COLORS.selected,
  })
  badge.innerHTML = `<svg width="15" height="12" viewBox="0 0 26 20" aria-hidden="true"><path d="M1 10 L7 4 L13 10 V19 H1 Z" fill="#fff"/><rect x="14" y="5" width="10" height="14" fill="${color === PIN_COLORS.venta ? '#9CC3DB' : '#F2B98C'}"/></svg>`
  button.append(badge, words(`${count} aquí`, 'Toca para ver', { wordColor: PIN_COLORS.selected, priceColor: PIN_COLORS.word, priceSize: 11 }))
  // "N aquí" reads first and larger, like the app.
  const w = button.lastElementChild as HTMLElement
  ;(w.firstElementChild as HTMLElement).style.fontSize = '14.5px'
  ;(w.firstElementChild as HTMLElement).style.letterSpacing = '0'
  ;(w.lastElementChild as HTMLElement).style.fontWeight = '500'
  button.addEventListener('click', (e) => {
    e.stopPropagation()
    onTap()
  })
  root.append(button, pointer('#FFFFFF'))
  return root
}
