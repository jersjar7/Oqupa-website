// ADR-058 — every sentence the Analítica page says, in one place, so the app
// can match it word for word. Spec: docs/owner-analytics-plan.md §2–§3.

import type { NoteKind, Thin, Totals } from './types'

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic']
const DAY_NAMES_PLURAL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados', 'domingos']
export const DAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** '2026-11-05' → '5 nov'. */
export function shortDay(day: string): string {
  const [, m = 1, d = 1] = day.split('-').map(Number)
  return `${d} ${MONTHS[m - 1] ?? ''}`
}

/** 4210 → '4,210' (Peru groups with commas, as the rest of the site). */
export const fmt = (n: number) => n.toLocaleString('en-US')

/** What each section is waiting to record, when nothing is recorded yet. */
export const NOT_RECORDED: Record<string, string> = {
  sources: 'de dónde llega cada persona',
  places: 'dónde están las personas que miran',
  marks: 'los cambios de fotos',
  demand: 'las búsquedas en el mapa',
  whatsapp: 'cuándo abren WhatsApp',
}

/** What is being counted, when there are too few. */
export function thinThings(section: string, district?: string | null): string {
  switch (section) {
    case 'heat':
    case 'contactRate':
      return 'vistas'
    case 'sources':
      return 'vistas con origen'
    case 'places':
      return 'personas con ubicación'
    case 'contactRatePeerVistas':
      return district ? `vistas en propiedades parecidas en ${district}` : 'vistas en propiedades parecidas'
    case 'zone':
    case 'compare':
    case 'contactRatePeers':
      return district ? `propiedades parecidas en ${district}` : 'propiedades parecidas'
    case 'daysToClose':
      return 'cierres parecidos'
    case 'demand':
      return 'búsquedas'
    default:
      return 'datos'
  }
}

/** The "Necesitamos más datos" sentence for a section that has no numbers. */
export function moreDataText(section: string, thin: Thin, district?: string | null): string {
  if (thin.status === 'needs-area') return 'Agrega los m² de tu propiedad para compararla con la zona.'
  if (thin.status === 'needs-price') return 'No podemos comparar este precio con la zona.'
  // How many other owners there are is not ours to tell (break-it web #13).
  if (thin.status === 'too-few-owners') {
    return `Necesitamos más datos: las propiedades parecidas${district ? ` en ${district}` : ''} son de muy pocos dueños para compararlas.`
  }
  if (thin.status === 'not-recorded') {
    const what = NOT_RECORDED[section] ?? 'esto'
    return thin.since
      ? `Necesitamos más datos. Empezamos a registrar ${what} el ${shortDay(thin.since)}.`
      : `Necesitamos más datos. Todavía no registramos ${what}.`
  }
  const kind =
    thin.status === 'too-few-peers' ? 'contactRatePeers'
      : thin.status === 'too-few-peer-vistas' ? 'contactRatePeerVistas'
        : section
  const things = thinThings(kind, district)
  const n = thin.n ?? 0
  const min = thin.min ?? 0
  const sinceText = thin.since ? ` Empezamos a registrarlo el ${shortDay(thin.since)}.` : ''
  return `Necesitamos más datos: hay ${fmt(n)} ${n === 1 ? singular(things) : things} y hacen falta al menos ${fmt(min)}.${sinceText}`
}

function singular(things: string): string {
  return things
    .replace(/^vistas con origen/, 'vista con origen')
    .replace(/^vistas/, 'vista')
    .replace(/^personas con ubicación/, 'persona con ubicación')
    .replace(/^propiedades parecidas/, 'propiedad parecida')
    .replace(/^cierres parecidos/, 'cierre parecido')
    .replace(/^búsquedas/, 'búsqueda')
}

/** A card's change against the period before: '▲ 24%', '▼ 12%', 'igual', or null (nothing to compare). */
export function changeText(current: number | null, previous: number | null | undefined): { text: string; up: boolean | null } | null {
  if (current === null || previous === null || previous === undefined) return null
  if (current === previous) return { text: 'igual', up: null }
  if (previous === 0) return { text: '▲ nuevo', up: true }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { text: 'igual', up: null }
  return pct > 0 ? { text: `▲ ${pct}%`, up: true } : { text: `▼ ${Math.abs(pct)}%`, up: false }
}

/** "La abren": vistas ÷ apariciones, one decimal. null when nothing was shown. */
export function openRate(t: Pick<Totals, 'shown' | 'seen'>): number | null {
  if (!t.shown) return null
  return Math.round((t.seen / t.shown) * 1000) / 10
}

/** Two-hour slot → "de 6 a 8 p. m." in Peru's way of saying hours. */
export function slotText(slot: number): string {
  const from = slot * 2
  const to = from + 2
  const h12 = (h: number) => (h % 12 === 0 ? 12 : h % 12)
  const half = (h: number) => (h < 12 || h === 24 ? 'a. m.' : 'p. m.')
  if (half(from) === half(to)) return `de ${h12(from)} a ${h12(to)} ${half(to)}`
  return `de ${h12(from)} ${half(from)} a ${h12(to)} ${half(to)}`
}

export function bestTimeText(best: { day: number; slot: number }): string {
  return `los ${DAY_NAMES_PLURAL[best.day]} ${slotText(best.slot)}`
}

/** Property types read with "lo" (el departamento…); the same list as countWords. */
const MASCULINE = new Set(['departamento', 'terreno', 'local', 'hospedaje', 'habitacion'])
export const pronoun = (type: string | null | undefined) => (type && MASCULINE.has(type) ? 'lo' : 'la')

/** The note on a Tu cartera row: a fact, never a verdict (ADR-022). */
export function noteText(note: NoteKind, type: string | null): { text: string; tone: 'ok' | 'warn' | 'neutral' } {
  switch (note.kind) {
    case 'ok':
      return { text: 'Al día', tone: 'ok' }
    case 'closed':
      return { text: 'Cerrada', tone: 'neutral' }
    case 'inactive':
      return { text: 'Desactivada', tone: 'neutral' }
    case 'no-views':
      return { text: `Nadie ${pronoun(type)} abrió en ${note.days} días`, tone: 'warn' }
    case 'price-above':
      return { text: `Precio ${note.pct}% sobre la mediana de la zona`, tone: 'warn' }
    case 'few-photos':
      return { text: note.photos === 1 ? '1 foto' : `${note.photos} fotos`, tone: 'warn' }
  }
}

export const SOURCE_LABELS: Record<string, string> = {
  direct: 'Directo en Oqupa',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  google: 'Google',
  share: 'Enlace compartido',
  other: 'Otros',
  app: 'App',
  web: 'Web',
}

export const TYPE_PLURAL: Record<string, string> = {
  casa: 'casas',
  departamento: 'departamentos',
  terreno: 'terrenos',
  oficina: 'oficinas',
  local: 'locales',
  hospedaje: 'alojamientos',
  habitacion: 'cuartos',
}

export const TYPE_SINGULAR: Record<string, string> = {
  casa: 'casa',
  departamento: 'departamento',
  terreno: 'terreno',
  oficina: 'oficina',
  local: 'local',
  hospedaje: 'alojamiento',
  habitacion: 'cuarto',
}
