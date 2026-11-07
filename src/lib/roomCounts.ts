// Room counts in correct Spanish. A stored 0 bathrooms is not shown, for any
// property type, as in the app (coordinator, 2026-11-02).

/** "1 baño" / "3 baños", or null when there is nothing to show. */
export function bathroomsLabel(count: number | null | undefined): string | null {
  if (count == null || !(count > 0)) return null
  return `${count} ${count === 1 ? 'baño' : 'baños'}`
}

/**
 * The number shown for a bedroom count: exactly what the owner entered, 0
 * included — Jerson, 2026-11-06 (ADR-053): "If the user says 0 then it should
 * stay 0. We don't need to lie for them." Same rule as the app.
 */
export function shownBedrooms(count: number): number {
  return count
}

/** "3 hab." — or just "3" with `bare`, where the label sits beside it. */
export function bedroomsLabel(
  count: number,
  { bare = false }: { bare?: boolean; propertyType?: string } = {},
): string {
  const n = shownBedrooms(count)
  return bare ? String(n) : `${n} hab.`
}
