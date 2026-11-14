// ADR-060 (Jerson, 2026-11-13: "Fix names"): how a person's name is saved.
//
// One rule, written identically in the app (oqupa lib/utils/person_name.dart)
// and the Cloud Functions (oqupa functions/lib/person-name.js), checked by the
// same list of examples in all three test suites:
//  - trim, and collapse runs of whitespace to one space;
//  - a word written entirely in capitals (2+ letters) is lowercased first;
//  - de, del, la, las, los, y, e, da, di, van, von stay lowercase unless they
//    are the first word (an initial keeps its period: "Juan E. Pérez");
//  - every other word gets a capital first letter, and a capital after a
//    hyphen or an apostrophe; the rest of the word is never lowercased
//    ("McDonald" stays) — unless capitalizing leaves the word in capitals
//    ("jOSÉ", caps lock on), which is then treated as capitals;
//  - accents and ñ are kept ("ñahui" → "Ñahui").
// Applying it twice changes nothing.

const PARTICLES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'di', 'van', 'von'])
const BOUNDARIES = "-'’"

function isAllCaps(word: string): boolean {
  let letters = 0
  for (const c of word) {
    if (c.toUpperCase() !== c.toLowerCase()) letters++
  }
  return letters >= 2 && word === word.toUpperCase()
}

function capitalizeAtBoundaries(word: string): string {
  let out = ''
  let atStart = true
  for (const c of word) {
    out += atStart ? c.toUpperCase() : c
    atStart = BOUNDARIES.includes(c)
  }
  return out
}

/** The name as it should be saved. Blank or missing input becomes ''. */
export function normalizePersonName(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return ''
  const words = raw.trim().split(/\s+/u).filter(Boolean)
  const out: string[] = []
  for (const typed of words) {
    let word = isAllCaps(typed) ? typed.toLowerCase() : typed
    const lower = word.toLowerCase()
    if (out.length > 0 && PARTICLES.has(lower)) {
      out.push(lower)
      continue
    }
    word = capitalizeAtBoundaries(word)
    // "jOSÉ" (caps lock) capitalizes to "JOSÉ": treat it as capitals.
    if (isAllCaps(word)) word = capitalizeAtBoundaries(word.toLowerCase())
    out.push(word)
  }
  return out.join(' ')
}
