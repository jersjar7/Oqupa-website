// ADR-060 (Jerson, 2026-11-13: "Fix names"): how a person's name is saved.
//
// One rule, written identically in the app (oqupa lib/utils/person_name.dart)
// and the Cloud Functions (oqupa functions/lib/person-name.js), checked by the
// same list of examples in all three test suites:
//  - trim, and collapse runs of whitespace to one space;
//  - SAC, SRL, EIRL, II, III, IV are always written in capitals;
//  - a word (or hyphen part) written entirely in capitals is lowercased first —
//    except, inside a name that also has normal words, one of 1-2 letters,
//    which stays as typed ("Claude QA") — Jerson, 2026-11-14;
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

function letterCount(word: string): number {
  let letters = 0
  for (const c of word) {
    if (c.toUpperCase() !== c.toLowerCase()) letters++
  }
  return letters
}

function isAllCaps(word: string): boolean {
  return letterCount(word) >= 2 && word === word.toUpperCase()
}

/** Always written in capitals, whatever the case typed (periods ignored: "S.A.C."). */
const KEPT_IN_CAPITALS = new Set(['sac', 'srl', 'eirl', 'ii', 'iii', 'iv'])

function isKeptInCapitals(part: string): boolean {
  return KEPT_IN_CAPITALS.has(part.replace(/\./g, '').toLowerCase())
}

function capitalizeAtBoundaries(word: string): string {
  let out = ''
  let atStart = true
  for (const c of word) {
    if (BOUNDARIES.includes(c)) {
      out += c
      atStart = true
    } else if (c.toUpperCase() !== c.toLowerCase()) {
      // The first LETTER after the start or a boundary, even past a leading period.
      out += atStart ? c.toUpperCase() : c
      atStart = false
    } else {
      out += c
    }
  }
  return out
}

/** The name as it should be saved. Blank or missing input becomes ''. */
export function normalizePersonName(raw: string | null | undefined): string {
  if (typeof raw !== 'string') return ''
  const words = raw.trim().split(/\s+/u).filter(Boolean)
  // The whole name in capitals: every part of two or more letters is in
  // capitals, and there is at least one (single letters and SAC/III… count
  // neither way: "A E" is not a name in capitals, "EO a" is).
  const longParts = words
    .flatMap((w) => w.split(/[-'’]/u))
    .filter((part) => letterCount(part) >= 2 && !isKeptInCapitals(part))
  const wholeNameInCapitals = longParts.length > 0 && longParts.every(isAllCaps)
  const out: string[] = []
  for (const typed of words) {
    // Capitals are judged per hyphen part, so "josé-MARÍA" is fixed too.
    // Jerson 2026-11-14, "Two letters plus list": SAC, SRL, EIRL, II, III, IV
    // are always capitals; inside a name with normal words, a capital part of
    // 1-2 letters stays as typed ("Claude QA", "Juan JC Pérez"); every other
    // capital part is converted ("Rosa PAZ" → "Rosa Paz"). A joining word is
    // never kept in capitals ("DEL Castillo" → "Del Castillo").
    const typedParts = typed.split('-')
    let word = typedParts
      .map((part) => {
        if (isKeptInCapitals(part)) return part.toUpperCase()
        if (!isAllCaps(part)) return part
        const keepShort = !wholeNameInCapitals && letterCount(part) <= 2 &&
          !PARTICLES.has(part.toLowerCase())
        return keepShort ? part : part.toLowerCase()
      })
      .join('-')
    const lower = word.toLowerCase()
    if (out.length > 0 && PARTICLES.has(lower)) {
      out.push(lower)
      continue
    }
    word = capitalizeAtBoundaries(word)
    // "jOSÉ" (caps lock) capitalizes to "JOSÉ": a part that capitalizing
    // turned into capitals (it was not typed that way) is fixed.
    word = word
      .split('-')
      .map((part, i) => (isAllCaps(part) && !isAllCaps(typedParts[i] ?? '') && !isKeptInCapitals(part)
        ? capitalizeAtBoundaries(part.toLowerCase())
        : part))
      .join('-')
    out.push(word)
  }
  return out.join(' ')
}
