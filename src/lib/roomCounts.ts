// Room counts in correct Spanish. A stored 0 bathrooms is not shown, for any
// property type, as in the app (coordinator, 2026-11-02).

/** "1 baño" / "3 baños", or null when there is nothing to show. */
export function bathroomsLabel(count: number | null | undefined): string | null {
  if (count == null || !(count > 0)) return null
  return `${count} ${count === 1 ? 'baño' : 'baños'}`
}

/**
 * "3 hab." — or just "3" with `bare`, where the label sits beside it. A
 * Departamento with 0 dormitorios reads "Monoambiente" (ADR-043 D4); no other
 * type ever does.
 */
export function bedroomsLabel(
  count: number,
  { bare = false, propertyType }: { bare?: boolean; propertyType?: string } = {},
): string {
  if (count === 0 && propertyType === 'departamento') return 'Monoambiente'
  return bare ? String(count) : `${count} hab.`
}
