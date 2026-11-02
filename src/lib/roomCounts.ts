// Room counts in correct Spanish. A stored 0 bathrooms is not shown, for any
// property type, as in the app (coordinator, 2026-11-02).

/** "1 baño" / "3 baños", or null when there is nothing to show. */
export function bathroomsLabel(count: number | null | undefined): string | null {
  if (count == null || !(count > 0)) return null
  return `${count} ${count === 1 ? 'baño' : 'baños'}`
}
