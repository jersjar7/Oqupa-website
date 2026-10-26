/**
 * Mouse or finger, and the instructions that go with each.
 *
 * The website is used with a mouse on computers and with a finger on phones
 * and tablets, so no instruction may assume one. "Toca para ver" on a
 * computer was the mistake that prompted this (2026-10-24). Every sentence
 * that tells someone how to act on the page comes from here.
 */
import { useEffect, useState } from 'react'

export type PointerKind = 'mouse' | 'touch'

/** True for a mouse or trackpad: it can hover and points precisely. */
export const MOUSE_QUERY = '(hover: hover) and (pointer: fine)'

type MatchMedia = (query: string) => { matches: boolean }

export function pointerKindFrom(matchMedia: MatchMedia | undefined): PointerKind {
  if (!matchMedia) return 'mouse'
  return matchMedia(MOUSE_QUERY).matches ? 'mouse' : 'touch'
}

export function currentPointerKind(): PointerKind {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'mouse'
  return pointerKindFrom((q) => window.matchMedia(q))
}

/** Follows the device, including a tablet that gets a mouse plugged in. */
export function usePointerKind(): PointerKind {
  const [kind, setKind] = useState<PointerKind>(currentPointerKind)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(MOUSE_QUERY)
    const update = () => setKind(currentPointerKind())
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])
  return kind
}

export function pointerWords(kind: PointerKind) {
  const mouse = kind === 'mouse'
  return {
    groupHint: mouse ? 'Click para ver' : 'Toca para ver',
    groupAria: (count: number) => `${count} propiedades aquí, ${mouse ? 'haz clic' : 'toca'} para ver`,
    emptyListZoomOutHint: mouse
      ? 'Vuelve al mapa y aléjalo con la rueda del mouse o el botón − para ver más lugares.'
      : 'Vuelve al mapa y aléjalo con dos dedos para ver más lugares.',
    locationPickerHint: `Arrastra el pin o ${mouse ? 'haz clic en' : 'toca'} el mapa para ajustar la ubicación`,
    photoReorderHint: mouse
      ? 'Arrastra las fotos para reordenarlas'
      : 'Mantén presionada una foto y arrástrala para reordenarla',
    dayPickerHint: mouse ? 'Haz clic en un día para programar.' : 'Toca un día para programar.',
  }
}
