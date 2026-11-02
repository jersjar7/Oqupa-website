/**
 * One publish identity per draft (ADR-043, decision 1).
 *
 * Every attempt to publish the same draft — a double click, a retry after an
 * error or a time-out, a refresh in the middle — writes the SAME two
 * documents, because both names come from this one id. A second attempt can
 * therefore never create a second listing.
 *
 * The id keeps the shape the website has always used for these documents
 * (`<ms>_<7 random chars>`), so nothing that reads the ids changes.
 */

export function newPublishId(now: number = Date.now()): string {
  return `${now}_${Math.random().toString(36).slice(2, 9).padEnd(7, '0')}`
}

export function propertyIdFor(publishId: string): string {
  return `property_${publishId}`
}

export function listingIdFor(publishId: string): string {
  return `listing_${publishId}`
}

/**
 * A stable name for a chosen photo, so a retry can tell which photos already
 * reached the server. The same file chosen twice gets `#1`, `#2`… so the two
 * copies are still told apart.
 */
export function photoFingerprints(files: readonly File[]): string[] {
  const seen = new Map<string, number>()
  return files.map((f) => {
    const base = `${f.name}:${f.size}:${f.lastModified}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return n === 0 ? base : `${base}#${n}`
  })
}
