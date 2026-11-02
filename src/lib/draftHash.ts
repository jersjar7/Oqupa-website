/**
 * A short fingerprint of what a publish attempt would save (ADR-043 review).
 *
 * Written onto the new listing, so a later attempt that finds the listing
 * already there can tell "that was this same draft" (success) from "the
 * draft was changed after an earlier attempt landed late" (say so honestly,
 * instead of pretending the changes were saved).
 *
 * Fields that differ per attempt without the person changing anything — the
 * publish and expiry dates, the traffic-source stamp — are left out.
 */

const VOLATILE_KEYS = new Set(['publishedAt', 'expiresAt', 'attribution', 'updatedAt', 'createdAt'])

function stable(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const v = (value as Record<string, unknown>)[key]
      if (v === undefined || VOLATILE_KEYS.has(key)) continue
      out[key] = stable(v)
    }
    return out
  }
  return value
}

// cyrb53: a fast 53-bit string hash. Not cryptographic; it only has to tell
// two versions of one person's draft apart.
function cyrb53(str: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)
}

export function draftHash(property: unknown, listing: unknown): string {
  return cyrb53(JSON.stringify(stable({ property, listing })))
}
