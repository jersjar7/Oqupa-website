// Which official district a stored name refers to — map plan step 1 (ADR-031).
//
// The district names stored on listings are inconsistent (measured on
// production 2026-10-24: "CASTILLA", "Castilla ", "Mancora", "26 de Octubre"…).
// This ignores capitals, surrounding spaces and accents and knows the aliases
// below. Same rules as the app's PeruGeography.findDistrict — both apps' tests
// pin the same cases.
import { PIURA_DISTRICTS, type PeruDistrict } from './piuraDistricts'

export type { PeruDistrict }

/** Other names in use for an official district, by normalised key. Each was
 *  seen in real data: Google's address lookup and older forms write "26 de
 *  Octubre"; the IGN boundary data spells "Tambo Grande". */
const DISTRICT_ALIASES: Record<string, string> = {
  '26 de octubre': 'Veintiséis de Octubre',
  'tambo grande': 'Tambogrande',
}

const ACCENTS: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n' }

/** Lower case, trimmed, Spanish accents removed. */
export function normalizePlaceName(input: string): string {
  return input.toLowerCase().trim().replace(/[áéíóúüñ]/g, (c) => ACCENTS[c] ?? c)
}

/**
 * The official district a stored name refers to, or null. A name shared by
 * two provincias (Salitral) is resolved only when [provincia] says which. The
 * provincia never overrides an unambiguous district — one listing stores
 * "CASTILLA" as its provincia. Never guesses: "Chato" gives null.
 */
export function findDistrict(name: string | null | undefined, provincia?: string | null): PeruDistrict | null {
  if (name == null) return null
  const key = normalizePlaceName(name)
  if (!key) return null
  const official = normalizePlaceName(DISTRICT_ALIASES[key] ?? key)
  const matches = PIURA_DISTRICTS.filter((d) => normalizePlaceName(d.distrito) === official)
  if (matches.length === 1) return matches[0]!
  if (matches.length === 0 || provincia == null) return null
  const p = normalizePlaceName(provincia)
  const byProvincia = matches.filter((d) => normalizePlaceName(d.provincia) === p)
  return byProvincia.length === 1 ? byProvincia[0]! : null
}
