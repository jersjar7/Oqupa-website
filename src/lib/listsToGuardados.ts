// ADR-046 #1 (2026-11-02): one Guardados for the app and the website — the
// app's users/{uid}/favorites. The website used to keep named lists
// (users/{uid}/lists). On sign-in their saves move into Guardados.
//
// Each list remembers which of its saves already moved (`migratedListingIds`,
// written in the same atomic write as the saves). So the move happens once:
// a save removed afterwards does not come back at the next sign-in, and a save
// added to a list later (by a browser tab still running the old site) still
// moves. The lists themselves are never deleted here — a later cleanup.

export interface OldList {
  id: string
  listingIds: string[]
  movedListingIds: string[]
}

export interface ListMoveStep {
  listId: string
  /** Saves to create in Guardados (not already there). */
  write: string[]
  /** Saves to record on the list as moved (includes ones already in Guardados). */
  mark: string[]
}

/** A value that can be a listing id, and so a part of "{uid}_{listingId}". */
export function isListingId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && !id.includes('/')
}

export function planListsMove(lists: OldList[], alreadySaved: Set<string>): ListMoveStep[] {
  const willExist = new Set(alreadySaved)
  const plan: ListMoveStep[] = []
  for (const list of lists) {
    const moved = new Set(list.movedListingIds)
    const mark: string[] = []
    const write: string[] = []
    for (const id of list.listingIds) {
      if (!isListingId(id) || moved.has(id) || mark.includes(id)) continue
      mark.push(id)
      if (!willExist.has(id)) {
        write.push(id)
        willExist.add(id)
      }
    }
    if (mark.length > 0) plan.push({ listId: list.id, write, mark })
  }
  return plan
}
