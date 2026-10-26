// The website must not tell a mouse user to "tocar" (Jerson, 2026-10-24:
// "they use a mouse … you can use 'click para ver' instead"). One helper
// decides mouse vs touch and gives every instruction its right verb.
import { describe, it, expect } from 'vitest'
import { MOUSE_QUERY, pointerKindFrom, pointerWords } from '@/lib/pointerWords'

const media = (mouse: boolean) => (q: string) => ({ matches: q === MOUSE_QUERY && mouse })

describe('pointerKindFrom', () => {
  it('a mouse or trackpad (hover + fine pointer) is mouse', () => {
    expect(MOUSE_QUERY).toBe('(hover: hover) and (pointer: fine)')
    expect(pointerKindFrom(media(true))).toBe('mouse')
  })
  it('a phone or tablet is touch', () => {
    expect(pointerKindFrom(media(false))).toBe('touch')
  })
  it('without matchMedia, assumes a mouse (the website is mostly used on computers)', () => {
    expect(pointerKindFrom(undefined)).toBe('mouse')
  })
})

describe('pointerWords', () => {
  const mouse = pointerWords('mouse')
  const touch = pointerWords('touch')

  it('group pin: Click para ver / Toca para ver', () => {
    expect(mouse.groupHint).toBe('Click para ver')
    expect(touch.groupHint).toBe('Toca para ver')
    expect(mouse.groupAria(3)).toBe('3 propiedades aquí, haz clic para ver')
    expect(touch.groupAria(3)).toBe('3 propiedades aquí, toca para ver')
  })

  it('empty list: mouse users zoom with the wheel or the − button, phones with two fingers', () => {
    expect(mouse.emptyListZoomOutHint).toBe(
      'Vuelve al mapa y aléjalo con la rueda del mouse o el botón − para ver más lugares.')
    expect(touch.emptyListZoomOutHint).toBe('Vuelve al mapa y aléjalo con dos dedos para ver más lugares.')
  })

  it('location picker: haz clic / toca el mapa', () => {
    expect(mouse.locationPickerHint).toBe('Arrastra el pin o haz clic en el mapa para ajustar la ubicación')
    expect(touch.locationPickerHint).toBe('Arrastra el pin o toca el mapa para ajustar la ubicación')
  })

  it('photo order: a mouse drags at once; a finger holds first (200 ms) then drags', () => {
    expect(mouse.photoReorderHint).toBe('Arrastra las fotos para reordenarlas')
    expect(touch.photoReorderHint).toBe('Mantén presionada una foto y arrástrala para reordenarla')
  })

  it('day picker: Haz clic / Toca un día', () => {
    expect(mouse.dayPickerHint).toBe('Haz clic en un día para programar.')
    expect(touch.dayPickerHint).toBe('Toca un día para programar.')
  })

  it('no mouse sentence says toca/tocar; no touch sentence says clic', () => {
    const all = (w: ReturnType<typeof pointerWords>) =>
      [w.groupHint, w.groupAria(2), w.emptyListZoomOutHint, w.locationPickerHint, w.photoReorderHint, w.dayPickerHint].join(' ')
    expect(all(mouse)).not.toMatch(/\btoca|\btocar|dedo|presionad/i)
    expect(all(touch)).not.toMatch(/clic|mouse|rueda/i)
  })
})
