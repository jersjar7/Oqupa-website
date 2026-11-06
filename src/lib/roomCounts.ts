// Room counts in correct Spanish. A stored 0 bathrooms is not shown, for any
// property type, as in the app (coordinator, 2026-11-02).

/** "1 baño" / "3 baños", or null when there is nothing to show. */
export function bathroomsLabel(count: number | null | undefined): string | null {
  if (count == null || !(count > 0)) return null
  return `${count} ${count === 1 ? 'baño' : 'baños'}`
}

/**
 * The number shown for a bedroom count. A listing saved with 0 (a
 * "monoambiente") reads 1 — Jerson, 2026-11-06 (ADR-053): "using the number 1
 * is enough". The stored value is not changed. Same rule as the app.
 */
export function shownBedrooms(count: number): number {
  return count < 1 ? 1 : count
}

/** "3 hab." — or just "3" with `bare`, where the label sits beside it. */
export function bedroomsLabel(
  count: number,
  { bare = false }: { bare?: boolean; propertyType?: string } = {},
): string {
  const n = shownBedrooms(count)
  return bare ? String(n) : `${n} hab.`
}
