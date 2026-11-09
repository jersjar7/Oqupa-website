// A listing's two numbers in words (Jerson 2026-11-07, supersedes ADR-051's
// "Apariciones" / "Vistas"): "Se mostró" — the app showed its card — and
// "La abrieron" — a person opened it. Always digits; 0 stays 0 (ADR-053).
// The app builds the same phrases; keep them identical.

/** Property types read with "lo" (el departamento, el terreno, …). */
const MASCULINE = new Set(['departamento', 'terreno', 'local', 'hospedaje', 'habitacion'])

export function veces(n: number): string {
  return n === 1 ? '1 vez' : `${n} veces`
}

/** One listing opened: "La abrieron 12 veces" / "Lo abrieron 1 vez". */
export function openedPhrase(n: number, propertyType?: string): string {
  const pronoun = propertyType && MASCULINE.has(propertyType) ? 'Lo' : 'La'
  return `${pronoun} abrieron ${veces(n)}`
}

/** One listing shown: "Se mostró 16 veces". */
export function shownPhrase(n: number): string {
  return `Se mostró ${veces(n)}`
}

/** Several listings opened: "Las abrieron 23 veces". */
export function openedTotalPhrase(n: number): string {
  return `Las abrieron ${veces(n)}`
}

/** Several listings shown: "Se mostraron 85 veces". */
export function shownTotalPhrase(n: number): string {
  return `Se mostraron ${veces(n)}`
}
